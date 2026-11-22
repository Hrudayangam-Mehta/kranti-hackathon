//! Deterministic integer-millisecond scheduling, including worker startup costs.

pub const WORKER_MS: u64 = 2_000;

pub fn cost(workers: &[Vec<usize>], durations: &[u64]) -> u64 {
    let loads: Vec<_> = workers.iter().filter(|w| !w.is_empty()).map(|w| w.iter().map(|i| durations[*i]).sum::<u64>()).collect();
    loads.iter().copied().max().unwrap_or(0) + WORKER_MS * loads.len() as u64
}

pub fn schedule(selected: &[bool], durations: &[u64]) -> Vec<Vec<usize>> {
    let mut order: Vec<_> = selected.iter().enumerate().filter_map(|(i, s)| if *s {Some(i)} else {None}).collect();
    if order.is_empty() { return Vec::new(); }
    // Positive selections can include free additional recall without an extra worker.
    for (i, duration) in durations.iter().enumerate() {
        if *duration == 0 && !selected[i] { order.push(i); }
    }
    order.sort_unstable_by(|a, b| durations[*b].cmp(&durations[*a]).then_with(|| a.cmp(b)));
    let sum: u64 = order.iter().map(|i| durations[*i]).sum();
    let largest = durations[order[0]];
    let mut best = vec![order.clone()];
    let mut best_cost = sum + WORKER_MS;
    for k in 2..=8.min(order.len()) {
        let lower_bound = largest.max(sum.div_ceil(k as u64)) + WORKER_MS * k as u64;
        if lower_bound >= best_cost { continue; }
        let mut bins = vec![Vec::new(); k];
        let mut loads = vec![0u64; k];
        for &test in &order {
            let target = (0..k).min_by_key(|i| (loads[*i], bins[*i].len(), *i)).unwrap();
            bins[target].push(test);
            loads[target] += durations[test];
        }
        improve(&mut bins, &mut loads, durations);
        bins.retain(|w| !w.is_empty());
        let candidate_cost = cost(&bins, durations);
        if candidate_cost < best_cost { best_cost = candidate_cost; best = bins; }
    }
    for worker in &mut best { worker.sort_unstable(); }
    best
}

/// Add lower-confidence impacted tests only inside already paid-for worker slack.
/// This never creates a worker or increases the current makespan.
pub fn augment_headroom(workers: &mut [Vec<usize>], reserves: &[bool], durations: &[u64]) {
    if workers.is_empty() { return; }
    let mut present = vec![false;durations.len()];
    let mut loads = Vec::with_capacity(workers.len());
    for worker in workers.iter() {
        let mut load = 0;
        for &test in worker { present[test] = true; load += durations[test]; }
        loads.push(load);
    }
    let makespan = *loads.iter().max().unwrap();
    let mut candidates: Vec<_> = reserves.iter().enumerate().filter_map(|(i,reserve)|if *reserve && !present[i] {Some(i)} else {None}).collect();
    // Shortest-first admits as many reserve tests as possible; best-fit keeps
    // the largest remaining pocket available for later tests.
    candidates.sort_unstable_by_key(|i| (durations[*i],*i));
    for test in candidates {
        let duration = durations[test];
        let target = (0..workers.len()).filter(|i| duration <= makespan-loads[*i]).min_by_key(|i|(makespan-loads[*i]-duration,*i));
        if let Some(target) = target {
            workers[target].push(test);
            loads[target] += duration;
        }
    }
    for worker in workers.iter_mut() { worker.sort_unstable(); }
}

/// A bounded exchange pass repairs simple LPT imbalance without expensive search.
fn improve(bins: &mut [Vec<usize>], loads: &mut [u64], durations: &[u64]) {
    for _ in 0..8 {
        let old_max = *loads.iter().max().unwrap();
        let high = (0..loads.len()).max_by_key(|i| (loads[*i], std::cmp::Reverse(*i))).unwrap();
        let mut action: Option<(usize, usize, Option<usize>, u64)> = None;
        let mut examined = 0usize;
        'search: for low in 0..loads.len() {
            if low == high || loads[low] >= loads[high] { continue; }
            for (hi_idx, test) in bins[high].iter().enumerate() {
                let d = durations[*test];
                if d == 0 { continue; }
                let target_max = loads[high].saturating_sub(d).max(loads[low] + d);
                if target_max < old_max && bins[high].len() > 1 && action.as_ref().is_none_or(|x| target_max < x.3) {
                    action = Some((low, hi_idx, None, target_max));
                }
                for (lo_idx, other) in bins[low].iter().enumerate() {
                    examined += 1;
                    if examined > 4096 { break 'search; }
                    let other_d = durations[*other];
                    if d <= other_d { continue; }
                    let delta = d - other_d;
                    let target_max = (loads[high] - delta).max(loads[low] + delta);
                    if target_max < old_max && action.as_ref().is_none_or(|x| target_max < x.3) {
                        action = Some((low, hi_idx, Some(lo_idx), target_max));
                    }
                }
            }
        }
        let Some((low, hi_idx, lo_idx, _)) = action else { break; };
        if let Some(lo_idx) = lo_idx {
            let a = bins[high][hi_idx]; let b = bins[low][lo_idx];
            bins[high][hi_idx] = b; bins[low][lo_idx] = a;
            loads[high] = loads[high] - durations[a] + durations[b];
            loads[low] = loads[low] - durations[b] + durations[a];
        } else {
            let test = bins[high].remove(hi_idx);
            bins[low].push(test);
            loads[high] -= durations[test]; loads[low] += durations[test];
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn small_workload_prefers_one_worker() {
        assert_eq!(schedule(&[true,true], &[100,100]).len(),1);
    }
    #[test] fn worker_count_accounts_for_overhead() {
        let durations = [4_000;8];
        let workers = schedule(&[true;8], &durations);
        assert_eq!(cost(&workers,&durations),16_000);
        assert_eq!(workers.len(),4);
    }
    #[test] fn empty_selection_stays_free() {
        assert!(schedule(&[false,false],&[0,100]).is_empty());
    }
    #[test] fn adds_zero_time_tests_only_with_existing_work() {
        let workers = schedule(&[false,true],&[0,100]);
        assert_eq!(workers,vec![vec![0,1]]);
        assert_eq!(cost(&workers,&[0,100]),2_100);
    }
    #[test] fn partition_is_complete_unique_and_deterministic() {
        let durations: Vec<_> = (0..500).map(|i| ((i * 977) % 3100) as u64).collect();
        let selection: Vec<_> = (0..500).map(|i| i % 3 != 0).collect();
        let workers = schedule(&selection,&durations);
        assert_eq!(workers,schedule(&selection,&durations));
        assert!(workers.len() <= 8);
        let mut counts=vec![0;500];
        for w in workers { for i in w { counts[i] += 1; } }
        for i in 0..500 { assert_eq!(counts[i],usize::from(selection[i] || durations[i]==0)); }
    }
    #[test] fn huge_single_test_does_not_waste_workers() {
        assert_eq!(schedule(&[true,true,true], &[100_000,1,1]).len(),1);
    }
    #[test] fn reserve_headroom_is_free_and_unique() {
        let durations = [10_000,4_000,5_000,1_000,8_000];
        let mut workers = vec![vec![0],vec![1]];
        let before = cost(&workers,&durations);
        augment_headroom(&mut workers,&[true,true,true,true,true],&durations);
        assert_eq!(cost(&workers,&durations),before);
        assert_eq!(workers,vec![vec![0],vec![1,2,3]]);
    }
    #[test] fn reserve_headroom_never_creates_workers_or_raises_cost() {
        let durations: Vec<_> = (0..500).map(|i| ((i * 977) % 3100) as u64).collect();
        let selection: Vec<_> = (0..500).map(|i| i % 7 == 0).collect();
        let mut workers = schedule(&selection,&durations);
        let before = cost(&workers,&durations);
        let worker_count = workers.len();
        augment_headroom(&mut workers,&[true;500],&durations);
        assert_eq!(cost(&workers,&durations),before);
        assert_eq!(workers.len(),worker_count);
        let mut counts = vec![0;500];
        for worker in workers { for test in worker { counts[test] += 1; } }
        for i in 0..500 { assert!(counts[i] <= 1); if selection[i] { assert_eq!(counts[i],1); } }
        let mut empty = Vec::new();
        augment_headroom(&mut empty,&[true;500],&durations);
        assert!(empty.is_empty());
    }
}
