//! Original coverage-guided test selector; public sample answers are never loaded.

mod diff;
mod json;
mod schedule;

use std::collections::{BTreeMap, BTreeSet};
use std::env;
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::Arc;

type TestSet = Arc<[usize]>;

const BASE_COMMIT: &str = "eb11aec4be8cb2122afe713a4816662c3f0fb2fa";
const STDOUT_LIMIT: usize = 2_000_000;

#[derive(Debug)]
struct TestCatalog {
    ids: Vec<String>,
    files: Vec<String>,
    durations: Vec<u64>,
}

impl TestCatalog {
    fn parse(input: &str) -> Result<Self, String> {
        let document = json::parse(input)?;
        let tests = document.get("tests")?.array()?;
        let mut catalog = Self { ids: Vec::new(), files: Vec::new(), durations: Vec::new() };
        let mut unique = BTreeSet::new();
        let mut total = 0u64;
        for (i, test) in tests.iter().enumerate() {
            if test.get("number")?.u64()? != i as u64 { return Err("test numbers must be contiguous and ordered".into()); }
            let id = test.get("id")?.string()?.to_owned();
            if !unique.insert(id.clone()) { return Err("duplicate pytest id".into()); }
            let duration = json::milliseconds(test.get("seconds")?)?;
            total = total.checked_add(duration).ok_or("total test duration overflow")?;
            catalog.ids.push(id);
            catalog.files.push(test.get("file")?.string()?.to_owned());
            catalog.durations.push(duration);
        }
        total.checked_add(schedule::WORKER_MS * 8).ok_or("worker cost overflow")?;
        Ok(catalog)
    }
    fn len(&self) -> usize { self.ids.len() }
}

#[derive(Debug)]
struct FunctionImpact {
    start: usize,
    end: usize,
    header_end: usize,
    tests: TestSet,
}

#[derive(Debug)]
struct FileImpact {
    lines: BTreeMap<usize, TestSet>,
    all: TestSet,
    functions: Vec<FunctionImpact>,
    importers: TestSet,
    source_sensitive: TestSet,
    source: Option<String>,
}

#[derive(Debug)]
struct ImpactMap { files: BTreeMap<String, FileImpact> }

impl ImpactMap {
    fn parse(input: &str, catalog: &TestCatalog) -> Result<Self, String> {
        let document = json::parse(input)?;
        if document.get("version")?.u64()? != 1 { return Err("unsupported impact-map version".into()); }
        if document.get("base_commit")?.string()? != BASE_COMMIT { return Err("impact-map base commit mismatch".into()); }
        if document.get("test_count")?.u64()? != catalog.len() as u64 { return Err("impact-map test count mismatch".into()); }
        if let Some(ids) = document.object()?.get("test_ids") {
            let ids = ids.array()?;
            if ids.len() != catalog.len() { return Err("impact-map test identity length mismatch".into()); }
            for (expected, actual) in ids.iter().zip(&catalog.ids) {
                if expected.string()? != actual { return Err("impact-map test identity mismatch".into()); }
            }
        }
        let sets = if let Some(values) = document.object()?.get("sets") {
            values.array()?.iter().map(|v| test_numbers(Some(v),catalog.len(),&[])).collect::<Result<Vec<_>,_>>()?
        } else { Vec::new() };
        let mut files = BTreeMap::new();
        for (path, file) in document.get("files")?.object()? {
            let fields = file.object()?;
            let mut lines = BTreeMap::new();
            if let Some(line_values) = fields.get("lines") {
                for (line, tests) in line_values.object()? {
                    let n = line.parse::<usize>().map_err(|_| "invalid coverage line")?;
                    // Some coverage engines report line zero for module entry.
                    // It cannot be targeted by a unified diff; file-level sets
                    // preserve its broader import dependency information.
                    if n == 0 { continue; }
                    lines.insert(n, test_numbers(Some(tests), catalog.len(),&sets)?);
                }
            }
            let mut functions = Vec::new();
            if let Some(function_values) = fields.get("functions") {
                for function in function_values.array()? {
                    let start = usize::try_from(function.get("start")?.u64()?).map_err(|_| "function start overflow")?;
                    let end = usize::try_from(function.get("end")?.u64()?).map_err(|_| "function end overflow")?;
                    let header_end = if let Some(v) = function.object()?.get("header_end") {
                        usize::try_from(v.u64()?).map_err(|_| "function header overflow")?
                    } else { start };
                    if start == 0 || end < start || header_end < start || header_end > end { return Err("invalid function range".into()); }
                    functions.push(FunctionImpact { start, end, header_end, tests: test_numbers(function.object()?.get("tests"),catalog.len(),&sets)? });
                }
            }
            functions.sort_by_key(|f| (f.end - f.start, f.start));
            let source = fields.get("source").map(|s| s.string().map(str::to_owned)).transpose()?;
            files.insert(path.clone(), FileImpact {
                lines, functions, source,
                all: test_numbers(fields.get("all"),catalog.len(),&sets)?,
                importers: test_numbers(fields.get("importers"),catalog.len(),&sets)?,
                source_sensitive: test_numbers(fields.get("source_sensitive"),catalog.len(),&sets)?,
            });
        }
        Ok(Self { files })
    }
}

fn test_numbers(value: Option<&json::Value>, count: usize, sets: &[TestSet]) -> Result<TestSet, String> {
    let Some(value) = value else { return Ok(Arc::from([])); };
    if matches!(value,json::Value::Number(_)) {
        let index = usize::try_from(value.u64()?).map_err(|_| "test-set reference overflow")?;
        return sets.get(index).cloned().ok_or_else(||"unknown interned test-set reference".into());
    }
    let mut numbers = Vec::new();
    for value in value.array()? {
        let number = usize::try_from(value.u64()?).map_err(|_| "test number overflow")?;
        if number >= count { return Err("impact-map contains unknown test".into()); }
        numbers.push(number);
    }
    numbers.sort_unstable(); numbers.dedup();
    Ok(numbers.into())
}

#[derive(Clone, Copy, Default, Debug)]
struct FileAnalysis { syntax_error: bool, ast_equal: bool }
#[derive(Default, Debug)]
struct CommitAnalysis { force_all: bool, files: BTreeMap<String, FileAnalysis> }
#[derive(Default, Debug)]
struct Analysis { commits: BTreeMap<String, CommitAnalysis> }

impl Analysis {
    fn parse(input: &str) -> Result<Self, String> {
        let document = json::parse(input)?;
        let mut result = Self::default();
        for (id, value) in document.get("commits")?.object()? {
            let mut commit = CommitAnalysis::default();
            commit.force_all = optional_bool(value.object()?.get("force_all"))?;
            if let Some(files) = value.object()?.get("files") {
                for (path, analysis) in files.object()? {
                    commit.files.insert(path.clone(), FileAnalysis {
                        syntax_error: optional_bool(analysis.object()?.get("syntax_error"))?,
                        ast_equal: optional_bool(analysis.object()?.get("ast_equal"))?,
                    });
                }
            }
            result.commits.insert(id.clone(),commit);
        }
        Ok(result)
    }
}

fn optional_bool(value: Option<&json::Value>) -> Result<bool,String> {
    match value { None => Ok(false), Some(json::Value::Bool(v)) => Ok(*v), _ => Err("analysis flag must be boolean".into()) }
}

#[derive(Clone, Copy, Debug, PartialEq)]
enum Policy { Line, Function }

fn extend(selected: &mut [bool], ids: &[usize]) { for id in ids { selected[*id] = true; } }

fn broad(selected: &mut [bool], info: &FileImpact) {
    extend(selected,&info.all);
    extend(selected,&info.importers);
    extend(selected,&info.source_sensitive);
}

fn select(changes: &[diff::FileChange], catalog: &TestCatalog, map: &ImpactMap, analysis: Option<&CommitAnalysis>, policy: Policy) -> Result<Vec<bool>,String> {
    if analysis.is_some_and(|a| a.force_all) { return Err("analysis requested conservative fallback".into()); }
    let mut selected = vec![false;catalog.len()];
    for change in changes {
        let path = change.path();
        let info = map.files.get(path).ok_or_else(|| format!("unmapped changed file: {path}"))?;
        if let Some(source) = &info.source {
            if change.old_path != "/dev/null" && !change.matches_source(source) { return Err(format!("patch does not match baseline: {path}")); }
        }
        extend(&mut selected,&info.source_sensitive);
        // Editing a test directly can affect its collection or its assertions.
        for (i, file) in catalog.files.iter().enumerate() {
            if file == &change.old_path || file == &change.new_path { selected[i] = true; }
        }
        if change.structural || change.old_path != change.new_path {
            broad(&mut selected,info);
            if change.new_path != change.old_path && change.new_path != "/dev/null" {
                if let Some(other) = map.files.get(&change.new_path) { broad(&mut selected,other); }
                else { return Err(format!("new or renamed destination is unmapped: {}",change.new_path)); }
            }
            continue;
        }
        let semantic = analysis.and_then(|a| a.files.get(path)).copied().unwrap_or_default();
        if semantic.syntax_error {
            // Import collection and lazy imports can reach a broken module
            // through paths absent from the baseline dynamic dependency graph.
            return Ok(vec![true;catalog.len()]);
        }
        if semantic.ast_equal && path.ends_with(".py") {
            // The sidecar is optional and must prove AST equality against the pinned
            // source. Source-reading tests above are never discarded by this flag.
            continue;
        }
        let (removed, insertions) = change.edits();
        if !path.ends_with(".py") {
            broad(&mut selected,info);
            continue;
        }
        for line in removed {
            select_line(&mut selected, info, line, policy);
        }
        for anchor in insertions {
            select_insertion(&mut selected,info,anchor,policy);
        }
    }
    Ok(selected)
}

fn function_at(info: &FileImpact,line: usize) -> Option<&FunctionImpact> {
    info.functions.iter().find(|f| f.start <= line && line <= f.end)
}

fn reserve_tests(changes: &[diff::FileChange], catalog: &TestCatalog, map: &ImpactMap) -> Vec<bool> {
    let mut reserves = vec![false;catalog.len()];
    for change in changes {
        let Some(info) = map.files.get(change.path()) else { continue; };
        let (removed,insertions) = change.edits();
        if change.structural || !change.path().ends_with(".py") { extend(&mut reserves,&info.all); continue; }
        for line in removed {
            if let Some(function) = function_at(info,line) { extend(&mut reserves,&function.tests); }
            else { extend(&mut reserves,&info.all); }
        }
        for anchor in insertions {
            for line in [anchor.saturating_sub(1),anchor] {
                if let Some(function) = function_at(info,line) { extend(&mut reserves,&function.tests); }
                else { extend(&mut reserves,&info.all); }
            }
        }
    }
    reserves
}

fn select_line(selected: &mut [bool], info: &FileImpact, line: usize, policy: Policy) {
    let function = function_at(info,line);
    if function.is_none() || function.is_some_and(|f| line <= f.header_end) {
        broad(selected,info);
        return;
    }
    let function = function.unwrap();
    if policy == Policy::Function {
        extend(selected,&function.tests);
        if function.tests.is_empty() { broad(selected,info); }
        return;
    }
    if let Some(tests) = info.lines.get(&line).filter(|tests| !tests.is_empty()) {
        extend(selected,tests);
    } else if !function.tests.is_empty() {
        extend(selected,&function.tests);
    } else {
        broad(selected,info);
    }
}

fn select_insertion(selected: &mut [bool], info: &FileImpact, anchor: usize, _policy: Policy) {
    let after = function_at(info,anchor);
    let before = anchor.checked_sub(1).and_then(|line|function_at(info,line));
    let function = match (before,after) {
        (Some(a),Some(b)) if a.start == b.start && a.end == b.end => a,
        // Inserting at a function boundary may replace a decorator or add module code.
        _ => { broad(selected,info); return; }
    };
    // An inserted else/except/return can make previously unexecuted paths
    // reachable. Neighbor-line coverage alone cannot bound that effect.
    if anchor <= function.header_end + 1 || function.tests.is_empty() { broad(selected,info); }
    else { extend(selected,&function.tests); }
}

struct Options { data: PathBuf, map: PathBuf, analysis: Option<PathBuf>, policy: Policy, baseline_all: bool }

fn options() -> Result<Options,String> {
    let mut result = Options { data: "/data".into(), map: "/opt/impact-map.json".into(), analysis: None, policy: Policy::Function, baseline_all: false };
    let mut args = env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--data" => result.data = args.next().ok_or("--data needs a directory")?.into(),
            "--map" => result.map = args.next().ok_or("--map needs a file")?.into(),
            "--analysis" => result.analysis = Some(args.next().ok_or("--analysis needs a file")?.into()),
            "--policy" => result.policy = match args.next().as_deref() { Some("line") => Policy::Line, Some("function") => Policy::Function, _ => return Err("--policy must be line or function".into()) },
            "--mode" => match args.next().as_deref() { Some("baseline-all") => result.baseline_all = true, Some("impact") => result.baseline_all = false, _ => return Err("--mode must be impact or baseline-all".into()) },
            "--help" | "-h" => {
                eprintln!("blast-radius-selector [--data /data] [--map /opt/impact-map.json] [--analysis FILE] [--policy function|line] [--mode impact|baseline-all]\nFunction is the default policy. Line is experimental and can miss short-circuit effects.\nOutputs only one JSON line per patch. Invalid maps/patches widen to every test.");
                std::process::exit(0);
            }
            _ => return Err(format!("unknown option: {arg}")),
        }
    }
    Ok(result)
}

fn read_limited(path: &Path, limit: u64) -> Result<String,String> {
    let metadata = fs::metadata(path).map_err(|e|format!("{}: {e}",path.display()))?;
    if metadata.len() > limit { return Err(format!("{} exceeds size limit",path.display())); }
    fs::read_to_string(path).map_err(|e|format!("{}: {e}",path.display()))
}

fn emit_line(output: &mut String,id: &str,workers: &[Vec<usize>]) {
    output.push_str("{\"commit\":"); output.push_str(&json::quote(id)); output.push_str(",\"workers\":[");
    for (i,worker) in workers.iter().enumerate() {
        if i > 0 { output.push(','); } output.push('[');
        for (j,test) in worker.iter().enumerate() {
            if j > 0 { output.push(','); } output.push_str(&test.to_string());
        }
        output.push(']');
    }
    output.push_str("]}\n");
}

fn run() -> Result<(),String> {
    let options = options()?;
    let catalog = TestCatalog::parse(&read_limited(&options.data.join("tests.json"),32_000_000)?)?;
    let map = if options.baseline_all { None } else {
        match read_limited(&options.map,128_000_000).and_then(|s| ImpactMap::parse(&s,&catalog)) {
            Ok(map) => Some(map),
            Err(error) => { eprintln!("map unavailable; selecting every test: {error}"); None }
        }
    };
    let mut analysis_failed = false;
    let analysis = if let Some(path) = &options.analysis {
        match read_limited(path,32_000_000).and_then(|s|Analysis::parse(&s)) {
            Ok(a) => Some(a),
            Err(error) => { eprintln!("analysis unavailable; selecting every test: {error}"); analysis_failed = true; None }
        }
    } else { None };
    let mut patches = Vec::new();
    for entry in fs::read_dir(options.data.join("commits")).map_err(|e|format!("cannot read commits: {e}"))? {
        let entry = entry.map_err(|e|format!("cannot read commit entry: {e}"))?;
        let path = entry.path();
        if path.extension().is_some_and(|extension| extension == "patch") { patches.push(path); }
    }
    patches.sort();
    let mut output = String::new();
    let mut simulated_ms = 0u64;
    let mut fallback_count = 0;
    let mut selected_count = 0;
    for path in &patches {
        let id = path.file_stem().and_then(|s|s.to_str()).ok_or("non-UTF8 commit filename")?;
        let missing_analysis = analysis.as_ref().is_some_and(|a| !a.commits.contains_key(id));
        let (selection,reserves) = if analysis_failed || missing_analysis || map.is_none() { (vec![true;catalog.len()],vec![false;catalog.len()]) } else {
            let attempt = read_limited(path,32_000_000).and_then(|s|diff::parse(&s)).and_then(|changes| {
                let map = map.as_ref().unwrap();
                select(&changes,&catalog,map,analysis.as_ref().and_then(|a|a.commits.get(id)),options.policy)
                    .map(|selection|(selection,reserve_tests(&changes,&catalog,map)))
            });
            match attempt {
                Ok(selection) => selection,
                Err(error) => { eprintln!("{id}: selecting every test ({error})"); fallback_count += 1; (vec![true;catalog.len()],vec![false;catalog.len()]) }
            }
        };
        let mut workers = schedule::schedule(&selection,&catalog.durations);
        schedule::augment_headroom(&mut workers,&reserves,&catalog.durations);
        simulated_ms += schedule::cost(&workers,&catalog.durations);
        selected_count += workers.iter().map(Vec::len).sum::<usize>();
        emit_line(&mut output,id,&workers);
        if output.len() > STDOUT_LIMIT { return Err("output would exceed conservative 2 MB limit".into()); }
    }
    // Build the complete response before writing, preventing partial JSON on an error.
    io::stdout().lock().write_all(output.as_bytes()).map_err(|e|format!("stdout write failed: {e}"))?;
    eprintln!("{} commits; {} scheduled tests; {} fallbacks; simulated selection cost {:.3}s (before misses and CPU)",patches.len(),selected_count,fallback_count,simulated_ms as f64/1000.0);
    Ok(())
}

fn main() {
    if let Err(error) = run() { eprintln!("selector error: {error}"); std::process::exit(2); }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn catalog() -> TestCatalog {
        TestCatalog::parse(r#"{"tests":[{"number":0,"id":"t0","file":"tests/a.py","seconds":0.1},{"number":1,"id":"t1","file":"tests/a.py","seconds":0.2},{"number":2,"id":"t2","file":"tests/b.py","seconds":0.3}]}"#).unwrap()
    }
    fn map() -> ImpactMap {
        let f=FileImpact { lines: BTreeMap::from([(2,Arc::from([0,1])),(3,Arc::from([0])),(4,Arc::from([1]))]), all:Arc::from([0,1]), functions:vec![FunctionImpact{start:1,end:5,header_end:1,tests:Arc::from([0,1])}], importers:Arc::from([0,1,2]), source_sensitive:Arc::from([2]),source:Some("def f():\n    x = 1\n    return x\n    x = 2\n    return x\n".into()) };
        ImpactMap{files:BTreeMap::from([("x.py".into(),f)])}
    }
    #[test] fn line_selection_preserves_source_sensitive_readers() {
        let p="--- a/x.py\n+++ b/x.py\n@@ -3 +3 @@\n-    return x\n+    return 2\n";
        assert_eq!(select(&diff::parse(p).unwrap(),&catalog(),&map(),None,Policy::Line).unwrap(),vec![true,false,true]);
    }
    #[test] fn function_policy_broadens_execution() {
        let p="--- a/x.py\n+++ b/x.py\n@@ -3 +3 @@\n-    return x\n+    return 2\n";
        assert_eq!(select(&diff::parse(p).unwrap(),&catalog(),&map(),None,Policy::Function).unwrap(),vec![true,true,true]);
    }
    #[test] fn header_change_includes_importers() {
        let p="--- a/x.py\n+++ b/x.py\n@@ -1 +1 @@\n-def f():\n+def f(x=broken):\n";
        assert_eq!(select(&diff::parse(p).unwrap(),&catalog(),&map(),None,Policy::Line).unwrap(),vec![true,true,true]);
    }
    #[test] fn ast_equivalence_keeps_source_sensitive_tests() {
        let p="--- a/x.py\n+++ b/x.py\n@@ -3 +3 @@\n-    return x\n+    return x # comment\n";
        let a=CommitAnalysis{force_all:false,files:BTreeMap::from([("x.py".into(),FileAnalysis{syntax_error:false,ast_equal:true})])};
        assert_eq!(select(&diff::parse(p).unwrap(),&catalog(),&map(),Some(&a),Policy::Line).unwrap(),vec![false,false,true]);
    }
    #[test] fn syntax_error_includes_importers() {
        let p="--- a/x.py\n+++ b/x.py\n@@ -3 +3 @@\n-    return x\n+    return (\n";
        let a=CommitAnalysis{force_all:false,files:BTreeMap::from([("x.py".into(),FileAnalysis{syntax_error:true,ast_equal:false})])};
        let mut incomplete_map=map();
        let file=incomplete_map.files.get_mut("x.py").unwrap();
        file.importers=Arc::from([0]);
        file.all=Arc::from([0]);
        file.source_sensitive=Arc::from([]);
        assert_eq!(select(&diff::parse(p).unwrap(),&catalog(),&incomplete_map,Some(&a),Policy::Function).unwrap(),vec![true,true,true]);
    }
    #[test] fn unknown_file_and_bad_baseline_are_not_silent_empty() {
        let unknown="--- a/unknown.py\n+++ b/unknown.py\n@@ -1 +1 @@\n-a\n+b\n";
        assert!(select(&diff::parse(unknown).unwrap(),&catalog(),&map(),None,Policy::Line).is_err());
        let wrong="--- a/x.py\n+++ b/x.py\n@@ -3 +3 @@\n-    return wrong\n+    return x\n";
        assert!(select(&diff::parse(wrong).unwrap(),&catalog(),&map(),None,Policy::Line).is_err());
    }
    #[test] fn output_commit_is_json_escaped() {
        let mut out=String::new(); emit_line(&mut out,"quoted\"\n",&[vec![1,2]]);
        let value=json::parse(out.trim_end()).unwrap();
        assert_eq!(value.get("commit").unwrap().string().unwrap(),"quoted\"\n");
        assert_eq!(value.object().unwrap().len(),2);
    }
    #[test] fn wrong_numbering_and_identity_are_rejected() {
        assert!(TestCatalog::parse(r#"{"tests":[{"number":1,"id":"x","file":"f","seconds":1}]}"#).is_err());
        let document=format!("{{\"version\":1,\"base_commit\":\"{BASE_COMMIT}\",\"test_count\":3,\"test_ids\":[\"bad\",\"t1\",\"t2\"],\"files\":{{}}}}");
        assert!(ImpactMap::parse(&document,&catalog()).is_err());
    }
    #[test] fn interned_sets_are_validated_and_shared() {
        let document=format!(r#"{{"version":1,"base_commit":"{BASE_COMMIT}","test_count":3,"sets":[[],[0,2]],"files":{{"x.py":{{"lines":{{"1":1,"2":1}},"all":1,"importers":0,"source_sensitive":0,"functions":[]}}}}}}"#);
        let map=ImpactMap::parse(&document,&catalog()).unwrap();
        let file=&map.files["x.py"];
        assert_eq!(&*file.all,&[0,2]);
        assert!(Arc::ptr_eq(&file.all,&file.lines[&1]));
        assert!(Arc::ptr_eq(&file.lines[&1],&file.lines[&2]));
        assert!(ImpactMap::parse(&document.replace("\"all\":1","\"all\":9"),&catalog()).is_err());
    }
    #[test] fn insertion_includes_previously_unreached_branch() {
        let mut map=map();
        let info=map.files.get_mut("x.py").unwrap();
        info.lines.insert(3,Arc::from([0]));
        info.lines.insert(4,Arc::from([0]));
        let mut selection=vec![false;3];
        select_insertion(&mut selection,info,4,Policy::Line);
        assert_eq!(selection,vec![true,true,false]);
    }
    #[test] fn short_circuit_replacement_requires_function_scope() {
        let mut map=map();
        let file=map.files.get_mut("x.py").unwrap();
        file.source=Some("def f(a,b):\n    if (a\n        and b):\n        return 1\n    return 0\n".into());
        file.lines.insert(3,Arc::from([0]));
        let patch="--- a/x.py\n+++ b/x.py\n@@ -3 +3 @@\n-        and b):\n+        or b):\n";
        let changes=diff::parse(patch).unwrap();
        assert_eq!(select(&changes,&catalog(),&map,None,Policy::Function).unwrap(),vec![true,true,true]);
        // Deliberately document why line mode is experimental, not the default.
        assert_eq!(select(&changes,&catalog(),&map,None,Policy::Line).unwrap(),vec![true,false,true]);
    }
}
