// Line-by-line Rust port of World._cast (+ _rayTerrain, ground, pointInEdges) and Nav._search from bot/lib,
// run on the same exported map arrays and the same recorded queries; results must match the JS bit for bit.
use std::fs;
use std::time::Instant;

const G: f64 = 16.0;
const INV_G: f64 = 1.0 / G;
const TINY: f64 = 1e-9;
const MARCH: f64 = 0.5;
const SQRT2: f64 = std::f64::consts::SQRT_2;
const DI: [i64; 8] = [1, 1, 0, -1, -1, -1, 0, 1];
const DJ: [i64; 8] = [0, 1, 1, 1, 0, -1, -1, -1];

fn rd(dir: &str, n: &str) -> Vec<u8> { fs::read(format!("{}/{}.bin", dir, n)).expect(n) }
fn f64s(b: &[u8]) -> Vec<f64> { b.chunks_exact(8).map(|c| f64::from_le_bytes(c.try_into().unwrap())).collect() }
fn f32s(b: &[u8]) -> Vec<f32> { b.chunks_exact(4).map(|c| f32::from_le_bytes(c.try_into().unwrap())).collect() }
fn i32s(b: &[u8]) -> Vec<i32> { b.chunks_exact(4).map(|c| i32::from_le_bytes(c.try_into().unwrap())).collect() }
fn num(meta: &str, key: &str) -> f64 {
    let k = format!("\"{}\":", key);
    let i = meta.find(&k).expect(key) + k.len();
    let rest = &meta[i..];
    let e = rest.find(|c: char| c == ',' || c == '}').unwrap();
    rest[..e].parse().unwrap()
}

struct World {
    gnx: i64, gny: i64, gx0: f64, gy0: f64, tnx: i64, tmin_x: f64, tmin_y: f64, t_step: f64, t_inv: f64,
    fx_max: f64, fy_max: f64, bnx: i64, bny: i64, b_size: f64, max_chord: f64,
    e: Vec<f64>, pe0: Vec<i32>, pe1: Vec<i32>, p_base: Vec<f64>, p_top: Vec<f64>,
    p_min_x: Vec<f64>, p_min_y: Vec<f64>, p_max_x: Vec<f64>, p_max_y: Vec<f64>,
    gp_s: Vec<i32>, gp_i: Vec<i32>, gt_s: Vec<i32>, gt_i: Vec<i32>, td: Vec<f64>, h: Vec<f32>, bmax: Vec<f32>,
    stamp_p: Vec<u32>, stamp_t: Vec<u32>, stamp: u32,
}

fn point_in_edges(e: &[f64], s: usize, en: usize, x: f64, y: f64) -> bool {
    let mut inside = false;
    let mut i = s;
    while i < en {
        let y0 = e[i + 1];
        let y1 = e[i + 3];
        if (y0 > y) != (y1 > y) {
            let x0 = e[i];
            if x < (e[i + 2] - x0) * (y - y0) / (y1 - y0) + x0 { inside = !inside; }
        }
        i += 4;
    }
    inside
}

impl World {
    #[inline]
    fn ground(&self, x: f64, y: f64) -> f64 {
        let mut fx = (x - self.tmin_x) * self.t_inv;
        let mut fy = (y - self.tmin_y) * self.t_inv;
        if fx < 0.0 { fx = 0.0 } else if fx > self.fx_max { fx = self.fx_max }
        if fy < 0.0 { fy = 0.0 } else if fy > self.fy_max { fy = self.fy_max }
        let i = fx as i64;
        let j = fy as i64;
        let sx = fx - i as f64;
        let sy = fy - j as f64;
        let nx = self.tnx;
        let k = (j * nx + i) as usize;
        let h = &self.h;
        let nxu = nx as usize;
        (h[k] as f64 * (1.0 - sx) + h[k + 1] as f64 * sx) * (1.0 - sy)
            + (h[k + nxu] as f64 * (1.0 - sx) + h[k + nxu + 1] as f64 * sx) * sy
    }

    fn next_stamp(&mut self) -> u32 {
        let mut s = self.stamp.wrapping_add(1);
        if s == u32::MAX || s == 0 { self.stamp_p.iter_mut().for_each(|v| *v = 0); self.stamp_t.iter_mut().for_each(|v| *v = 0); s = 1; }
        self.stamp = s;
        s
    }

    fn ray_terrain(&self, ax: f64, ay: f64, az: f64, dx: f64, dy: f64, dz: f64, t_end: f64, any: bool) -> f64 {
        if az < self.ground(ax, ay) { return 0.0; }
        if t_end <= 0.0 { return t_end; }
        let hl = (dx * dx + dy * dy).sqrt();
        let f = self.b_size;
        let (mx, my) = (self.tmin_x, self.tmin_y);
        let (bnx, bny) = (self.bnx, self.bny);
        let mut bi = ((ax - mx) / f).floor() as i64;
        let mut bj = ((ay - my) / f).floor() as i64;
        let mut t = 0.0f64;
        let mut tn = t_end;
        let mut hit = false;
        if !(hl > TINY) {
            let z_end = az + dz * t_end;
            let top = if bi >= 0 && bj >= 0 && bi < bnx && bj < bny { self.bmax[(bj * bnx + bi) as usize] as f64 } else { f64::INFINITY };
            if (if az < z_end { az } else { z_end }) > top { return t_end; }
            hit = z_end < self.ground(ax + dx * t_end, ay + dy * t_end);
        } else {
            let dt = MARCH * self.t_step / hl;
            let si: i64 = if dx > 0.0 { 1 } else { -1 };
            let sj: i64 = if dy > 0.0 { 1 } else { -1 };
            let mut tmx = if dx > TINY { (mx + bi as f64 * f + f - ax) / dx } else if dx < -TINY { (mx + bi as f64 * f - ax) / dx } else { f64::INFINITY };
            let mut tmy = if dy > TINY { (my + bj as f64 * f + f - ay) / dy } else if dy < -TINY { (my + bj as f64 * f - ay) / dy } else { f64::INFINITY };
            let tdx = if dx > TINY || dx < -TINY { f / dx.abs() } else { f64::INFINITY };
            let tdy = if dy > TINY || dy < -TINY { f / dy.abs() } else { f64::INFINITY };
            let mut guard = 0u32;
            while t < t_end && guard < 400000 {
                while guard < 400000 {
                    if tmx <= tmy { if t < tmx { break } tmx += tdx; bi += si } else { if t < tmy { break } tmy += tdy; bj += sj }
                    guard += 1;
                }
                let mut t_exit = (if tmx < tmy { tmx } else { tmy }) + 1e-6;
                if t_exit > t_end { t_exit = t_end }
                if bi >= 0 && bj >= 0 && bi < bnx && bj < bny {
                    let za = az + dz * t;
                    let zb = az + dz * t_exit;
                    if (if za < zb { za } else { zb }) > self.bmax[(bj * bnx + bi) as usize] as f64 { t = t_exit; guard += 1; continue; }
                }
                tn = t + dt;
                if tn > t_end { tn = t_end }
                if az + dz * tn < self.ground(ax + dx * tn, ay + dy * tn) { hit = true; break; }
                if tn >= t_end { break; }
                t = tn;
                guard += 1;
            }
        }
        if !hit { return t_end; }
        if any { return 0.0; }
        let (mut lo, mut hi) = (t, tn);
        for _ in 0..20 {
            let mid = (lo + hi) / 2.0;
            if az + dz * mid < self.ground(ax + dx * mid, ay + dy * mid) { hi = mid } else { lo = mid }
        }
        hi
    }

    fn cast(&mut self, ax: f64, ay: f64, az: f64, bx: f64, by: f64, bz: f64, mode: u32) -> f64 {
        let (dx, dy, dz) = (bx - ax, by - ay, bz - az);
        let fin = ax + ay + az + dx + dy + dz;
        if fin - fin != 0.0 || fin.is_nan() { return 0.0; }
        let trunks = mode == 1 || mode >= 3;
        let any = mode >= 2;
        let canopy = mode == 3;
        let mut best = 1.0f64;
        let (gnx, gny) = (self.gnx, self.gny);
        let (x0g, y0g) = (self.gx0, self.gy0);
        let (x1g, y1g) = (x0g + gnx as f64 * G, y0g + gny as f64 * G);
        let (mut t0, mut t1, mut in_grid) = (0.0f64, 1.0f64, true);
        if dx > 0.0 { let a = (x0g - ax) / dx; let b = (x1g - ax) / dx; if a > t0 { t0 = a } if b < t1 { t1 = b } }
        else if dx < 0.0 { let a = (x1g - ax) / dx; let b = (x0g - ax) / dx; if a > t0 { t0 = a } if b < t1 { t1 = b } }
        else if ax < x0g || ax >= x1g { in_grid = false }
        if dy > 0.0 { let a = (y0g - ay) / dy; let b = (y1g - ay) / dy; if a > t0 { t0 = a } if b < t1 { t1 = b } }
        else if dy < 0.0 { let a = (y1g - ay) / dy; let b = (y0g - ay) / dy; if a > t0 { t0 = a } if b < t1 { t1 = b } }
        else if ay < y0g || ay >= y1g { in_grid = false }

        if in_grid && t0 <= t1 {
            let stamp = self.next_stamp();
            let flat_x = dx > -TINY && dx < TINY;
            let flat_y = dy > -TINY && dy < TINY;
            let flat_z = dz > -TINY && dz < TINY;
            let ix = if flat_x { 0.0 } else { 1.0 / dx };
            let iy = if flat_y { 0.0 } else { 1.0 / dy };
            let iz = if flat_z { 0.0 } else { 1.0 / dz };
            let m2 = dx * dx + dy * dy;
            let len3 = if canopy { (m2 + dz * dz).sqrt() } else { 0.0 };
            let max_chord = self.max_chord;
            let mut chord = 0.0f64;
            let mut ci = ((ax + dx * t0 - x0g) * INV_G).floor() as i64;
            let mut cj = ((ay + dy * t0 - y0g) * INV_G).floor() as i64;
            if ci < 0 { ci = 0 } else if ci >= gnx { ci = gnx - 1 }
            if cj < 0 { cj = 0 } else if cj >= gny { cj = gny - 1 }
            let si: i64 = if dx > 0.0 { 1 } else { -1 };
            let sj: i64 = if dy > 0.0 { 1 } else { -1 };
            let mut tmx = if dx > 0.0 { (x0g + (ci + 1) as f64 * G - ax) / dx } else if dx < 0.0 { (x0g + ci as f64 * G - ax) / dx } else { f64::INFINITY };
            let mut tmy = if dy > 0.0 { (y0g + (cj + 1) as f64 * G - ay) / dy } else if dy < 0.0 { (y0g + cj as f64 * G - ay) / dy } else { f64::INFINITY };
            let tdx = if dx != 0.0 { G / dx.abs() } else { f64::INFINITY };
            let tdy = if dy != 0.0 { G / dy.abs() } else { f64::INFINITY };
            loop {
                let c = (cj * gnx + ci) as usize;
                let (qs, qe) = (self.gp_s[c] as usize, self.gp_s[c + 1] as usize);
                for q in qs..qe {
                    let k = self.gp_i[q] as usize;
                    if self.stamp_p[k] == stamp { continue }
                    self.stamp_p[k] = stamp;
                    let (base, top) = (self.p_base[k], self.p_top[k]);
                    let (mut lo, mut hi) = (0.0f64, best);
                    if flat_z { if az < base || az > top { continue } } else {
                        let (mut a, mut b) = ((base - az) * iz, (top - az) * iz);
                        if a > b { std::mem::swap(&mut a, &mut b) }
                        if a > lo { lo = a } if b < hi { hi = b }
                        if lo > hi { continue }
                    }
                    let (min_x, max_x) = (self.p_min_x[k], self.p_max_x[k]);
                    if flat_x { if ax < min_x || ax > max_x { continue } } else {
                        let (mut a, mut b) = ((min_x - ax) * ix, (max_x - ax) * ix);
                        if a > b { std::mem::swap(&mut a, &mut b) }
                        if a > lo { lo = a } if b < hi { hi = b }
                        if lo > hi { continue }
                    }
                    let (min_y, max_y) = (self.p_min_y[k], self.p_max_y[k]);
                    if flat_y { if ay < min_y || ay > max_y { continue } } else {
                        let (mut a, mut b) = ((min_y - ay) * iy, (max_y - ay) * iy);
                        if a > b { std::mem::swap(&mut a, &mut b) }
                        if a > lo { lo = a } if b < hi { hi = b }
                        if lo > hi { continue }
                    }
                    let (e0, e1) = (self.pe0[k] as usize, self.pe1[k] as usize);
                    let e = &self.e;
                    if az >= base && az <= top && ax >= min_x && ax <= max_x && ay >= min_y && ay <= max_y && point_in_edges(e, e0, e1, ax, ay) { return 0.0; }
                    let mut ei = e0;
                    while ei < e1 {
                        let (x0, y0) = (e[ei], e[ei + 1]);
                        let (ex, ey) = (e[ei + 2] - x0, e[ei + 3] - y0);
                        ei += 4;
                        let den = dx * ey - dy * ex;
                        if den > -TINY && den < TINY { continue }
                        let (hx, hy) = (x0 - ax, y0 - ay);
                        let un = hx * dy - hy * dx;
                        if den > 0.0 { if un < 0.0 || un > den { continue } } else if un > 0.0 || un < den { continue }
                        let t = (hx * ey - hy * ex) / den;
                        if t < 0.0 || t >= best { continue }
                        let z = az + dz * t;
                        if z < base || z > top { continue }
                        best = t;
                    }
                    if !flat_z {
                        let t = ((if dz < 0.0 { top } else { base }) - az) * iz;
                        if t >= 0.0 && t < best {
                            let (x, y) = (ax + dx * t, ay + dy * t);
                            if x >= min_x && x <= max_x && y >= min_y && y <= max_y && point_in_edges(e, e0, e1, x, y) { best = t }
                        }
                    }
                    if any && best < 1.0 { return 0.0; }
                }
                if trunks {
                    let (qs, qe) = (self.gt_s[c] as usize, self.gt_s[c + 1] as usize);
                    for q in qs..qe {
                        let k = self.gt_i[q] as usize;
                        if self.stamp_t[k] == stamp { continue }
                        self.stamp_t[k] = stamp;
                        let o = k * 10;
                        let td = &self.td;
                        if m2 >= TINY {
                            let (fx, fy) = (ax - td[o], ay - td[o + 1]);
                            let hb = fx * dx + fy * dy;
                            let disc = hb * hb - m2 * (fx * fx + fy * fy - td[o + 2]);
                            if disc >= 0.0 {
                                let t = (-hb - disc.sqrt()) / m2;
                                if t >= 0.0 && t < best {
                                    let z = az + dz * t;
                                    if z >= td[o + 3] && z <= td[o + 4] { if any { return 0.0 } best = t }
                                }
                            }
                        }
                        if canopy {
                            let (ir, irz) = (td[o + 8], td[o + 9]);
                            let (sx, sy, sz) = ((ax - td[o + 5]) * ir, (ay - td[o + 6]) * ir, (az - td[o + 7]) * irz);
                            let (ux, uy, uz) = (dx * ir, dy * ir, dz * irz);
                            let qa = ux * ux + uy * uy + uz * uz;
                            if qa >= TINY {
                                let qb = sx * ux + sy * uy + sz * uz;
                                let disc = qb * qb - qa * (sx * sx + sy * sy + sz * sz - 1.0);
                                if disc > 0.0 {
                                    let s = disc.sqrt();
                                    let (mut v0, mut v1) = ((-qb - s) / qa, (-qb + s) / qa);
                                    if v1 >= 0.0 && v0 <= 1.0 {
                                        if v0 < 0.0 { v0 = 0.0 } if v1 > 1.0 { v1 = 1.0 }
                                        chord += (v1 - v0) * len3;
                                        if chord > max_chord { return 0.0 }
                                    }
                                }
                            }
                        }
                    }
                }
                let tn;
                if tmx < tmy { tn = tmx; tmx += tdx; ci += si } else { tn = tmy; tmy += tdy; cj += sj }
                if tn > best || tn > t1 { break }
                if ci < 0 || ci >= gnx || cj < 0 || cj >= gny { break }
            }
        }
        let tt = self.ray_terrain(ax, ay, az, dx, dy, dz, best, any);
        if any { return if tt < best { 0.0 } else { 1.0 } }
        tt
    }
}

struct Nav {
    nx: i64, cell: f64, x0: f64, y0: f64, steps: Vec<u8>, off: [i64; 8], g: Vec<f32>, par: Vec<i32>, seen: Vec<u32>,
    closed: Vec<u32>, gen: u32, hn: Vec<i32>, hf: Vec<f32>, hcap: usize, expanded: u32, best: i64,
}

impl Nav {
    fn search(&mut self, s: i64, t: i64, bx: f64, by: f64, r_goal: f64, max_expand: u32, weight: f64) -> i64 {
        let (nx, cell, x0, y0) = (self.nx, self.cell, self.x0, self.y0);
        let (gi, gj) = (t % nx, t / nx);
        let rg2 = r_goal * r_goal;
        let mut gen = self.gen.wrapping_add(1);
        if gen == u32::MAX || gen == 0 { self.seen.iter_mut().for_each(|v| *v = 0); self.closed.iter_mut().for_each(|v| *v = 0); gen = 1 }
        self.gen = gen;
        let diag_len = cell * SQRT2;
        let d2 = SQRT2 - 2.0;
        let (di0, dj0) = ((s % nx - gi).abs(), (s / nx - gj).abs());
        let mut best_h = cell * ((di0 + dj0) as f64 + d2 * (if di0 < dj0 { di0 } else { dj0 }) as f64);
        let mut best_node = s;
        let su = s as usize;
        self.g[su] = 0.0; self.par[su] = -1; self.seen[su] = gen;
        self.hn[0] = s as i32; self.hf[0] = (best_h * weight) as f32;
        let mut hs = 1usize;
        let (mut found, mut expanded, mut budget_hit) = (-1i64, 0u32, false);
        while hs > 0 {
            let c = self.hn[0] as i64;
            hs -= 1;
            if hs > 0 {
                let (ln, lf) = (self.hn[hs], self.hf[hs]);
                let mut p = 0usize;
                loop {
                    let mut ch = 2 * p + 1;
                    if ch >= hs { break }
                    if ch + 1 < hs && self.hf[ch + 1] < self.hf[ch] { ch += 1 }
                    if self.hf[ch] >= lf { break }
                    self.hn[p] = self.hn[ch]; self.hf[p] = self.hf[ch]; p = ch;
                }
                self.hn[p] = ln; self.hf[p] = lf;
            }
            let cu = c as usize;
            if self.closed[cu] == gen { continue }
            self.closed[cu] = gen;
            let (ci, cj) = (c % nx, c / nx);
            if c == t { found = c; break }
            if r_goal > 0.0 {
                let ddx = x0 + (ci as f64 + 0.5) * cell - bx;
                let ddy = y0 + (cj as f64 + 0.5) * cell - by;
                if ddx * ddx + ddy * ddy <= rg2 { found = c; break }
            }
            let (hi, hj) = ((ci - gi).abs(), (cj - gj).abs());
            let hc = cell * ((hi + hj) as f64 + d2 * (if hi < hj { hi } else { hj }) as f64);
            if hc < best_h { best_h = hc; best_node = c }
            expanded += 1;
            if expanded >= max_expand { budget_hit = true; break }
            let sb = self.steps[cu];
            let gc = self.g[cu] as f64;
            for d in 0..8 {
                if (sb >> d) & 1 == 0 { continue }
                let nb = c + self.off[d];
                let nbu = nb as usize;
                if self.closed[nbu] == gen { continue }
                let ng = gc + if d & 1 == 1 { diag_len } else { cell };
                if self.seen[nbu] == gen && (self.g[nbu] as f64) <= ng { continue }
                self.g[nbu] = ng as f32; self.par[nbu] = c as i32; self.seen[nbu] = gen;
                let (ni, nj) = ((ci + DI[d] - gi).abs(), (cj + DJ[d] - gj).abs());
                let f = ng + weight * cell * ((ni + nj) as f64 + d2 * (if ni < nj { ni } else { nj }) as f64);
                if hs >= self.hcap { budget_hit = true; break }
                let mut p = hs;
                hs += 1;
                while p > 0 {
                    let q = (p - 1) >> 1;
                    if (self.hf[q] as f64) <= f { break }
                    self.hn[p] = self.hn[q]; self.hf[p] = self.hf[q]; p = q;
                }
                self.hn[p] = nb as i32; self.hf[p] = f as f32;
            }
            if budget_hit { break }
        }
        self.best = best_node; self.expanded = expanded;
        let _ = best_h;
        found
    }
}

fn main() {
    let dir = std::env::args().nth(1).expect("data dir");
    let meta = fs::read_to_string(format!("{}/meta.json", dir)).unwrap();
    let mut w = World {
        gnx: num(&meta, "gnx") as i64, gny: num(&meta, "gny") as i64, gx0: num(&meta, "gx0"), gy0: num(&meta, "gy0"),
        tnx: num(&meta, "tnx") as i64, tmin_x: num(&meta, "tMinX"), tmin_y: num(&meta, "tMinY"), t_step: num(&meta, "tStep"),
        t_inv: num(&meta, "tInv"), fx_max: num(&meta, "fxMax"), fy_max: num(&meta, "fyMax"), bnx: num(&meta, "bnx") as i64,
        bny: num(&meta, "bny") as i64, b_size: num(&meta, "bSize"), max_chord: num(&meta, "maxCanopyChord"),
        e: f64s(&rd(&dir, "E")), pe0: i32s(&rd(&dir, "pe0")), pe1: i32s(&rd(&dir, "pe1")), p_base: f64s(&rd(&dir, "pBase")),
        p_top: f64s(&rd(&dir, "pTop")), p_min_x: f64s(&rd(&dir, "pMinX")), p_min_y: f64s(&rd(&dir, "pMinY")),
        p_max_x: f64s(&rd(&dir, "pMaxX")), p_max_y: f64s(&rd(&dir, "pMaxY")), gp_s: i32s(&rd(&dir, "gpS")), gp_i: i32s(&rd(&dir, "gpI")),
        gt_s: i32s(&rd(&dir, "gtS")), gt_i: i32s(&rd(&dir, "gtI")), td: f64s(&rd(&dir, "T")), h: f32s(&rd(&dir, "h")), bmax: f32s(&rd(&dir, "bmax")),
        stamp_p: vec![0; num(&meta, "nP") as usize], stamp_t: vec![0; num(&meta, "nT") as usize], stamp: 0,
    };
    let c = f64s(&rd(&dir, "casts"));
    let nc = c.len() / 8;
    let mut bad = 0usize;
    for i in 0..nc { let o = i * 8; if w.cast(c[o], c[o + 1], c[o + 2], c[o + 3], c[o + 4], c[o + 5], c[o + 6] as u32) != c[o + 7] { bad += 1 } }
    let mut best_ms = f64::INFINITY;
    let mut sum = 0.0;
    for _ in 0..3 {
        let t = Instant::now();
        for i in 0..nc { let o = i * 8; sum += w.cast(c[o], c[o + 1], c[o + 2], c[o + 3], c[o + 4], c[o + 5], c[o + 6] as u32) }
        let ms = t.elapsed().as_secs_f64() * 1e3;
        if ms < best_ms { best_ms = ms }
    }
    let mut bt: Vec<f64> = Vec::new();
    let mut i = 0;
    while i + 250 <= nc {
        let t = Instant::now();
        for k in i..i + 250 { let o = k * 8; sum += w.cast(c[o], c[o + 1], c[o + 2], c[o + 3], c[o + 4], c[o + 5], c[o + 6] as u32) }
        bt.push(t.elapsed().as_secs_f64() * 1e3);
        i += 250;
    }
    bt.sort_by(|a, b| a.partial_cmp(b).unwrap());
    // ---- A*
    let offs: Vec<i64> = { let k = meta.find("\"off\":[").unwrap() + 7; let e = meta[k..].find(']').unwrap(); meta[k..k + e].split(',').map(|v| v.parse().unwrap()).collect() };
    let navb = &meta[meta.find("\"nav\":").unwrap()..];
    let hcap = num(navb, "heapCap") as usize;
    let n = num(navb, "n") as usize;
    let mut nav = Nav {
        nx: num(navb, "nx") as i64, cell: num(navb, "cell"), x0: num(navb, "x0"), y0: num(navb, "y0"), steps: rd(&dir, "steps"),
        off: offs.clone().try_into().unwrap(), g: vec![0.0; n], par: vec![0; n], seen: vec![0; n], closed: vec![0; n], gen: 0,
        hn: vec![0; hcap], hf: vec![0.0; hcap], hcap, expanded: 0, best: 0,
    };
    let a = f64s(&rd(&dir, "astar"));
    let na = a.len() / 10;
    let (mut abad, mut exp) = (0usize, 0u64);
    for j in 0..na {
        let o = j * 10;
        let r = nav.search(a[o] as i64, a[o + 1] as i64, a[o + 2], a[o + 3], a[o + 4], a[o + 5] as u32, a[o + 6]);
        if r as f64 != a[o + 7] || nav.expanded as f64 != a[o + 8] || nav.best as f64 != a[o + 9] { abad += 1 }
        exp += nav.expanded as u64;
    }
    let mut abest = f64::INFINITY;
    let mut slow = (0.0f64, 0u32);
    for _ in 0..3 {
        let t = Instant::now();
        for j in 0..na {
            let o = j * 10;
            let t1 = Instant::now();
            nav.search(a[o] as i64, a[o + 1] as i64, a[o + 2], a[o + 3], a[o + 4], a[o + 5] as u32, a[o + 6]);
            let ms = t1.elapsed().as_secs_f64() * 1e3;
            if ms > slow.0 { slow = (ms, nav.expanded) }
        }
        let ms = t.elapsed().as_secs_f64() * 1e3;
        if ms < abest { abest = ms }
    }
    println!("{{\"engine\":\"rust\",\"casts\":{},\"cast_mismatch\":{},\"cast_total_ms\":{:.1},\"cast_ns_each\":{:.0},\"batch250_ms\":{{\"p50\":{:.3},\"p99\":{:.3},\"max\":{:.3}}},\"astar\":{},\"astar_mismatch\":{},\"expanded_total\":{},\"astar_total_ms\":{:.1},\"ns_per_expansion\":{:.1},\"slowest_search_ms\":{:.2},\"slowest_expanded\":{},\"chk\":{:.3}}}",
        nc, bad, best_ms, best_ms / nc as f64 * 1e6, bt[bt.len() / 2], bt[(bt.len() as f64 * 0.99) as usize], bt[bt.len() - 1],
        na, abad, exp, abest, abest / exp as f64 * 1e6, slow.0, slow.1, sum);
}
