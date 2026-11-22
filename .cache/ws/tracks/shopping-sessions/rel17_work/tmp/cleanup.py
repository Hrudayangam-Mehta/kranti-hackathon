import sys
p = sys.argv[1]
s = open(p).read()
old = """    fs::create_dir_all(&dir)?;
    let _ = fs::set_permissions(&dir, Permissions::from_mode(0o777));
    Ok(())
}
"""
new = """    fs::create_dir_all(&dir)?;
    let _ = fs::set_permissions(&dir, Permissions::from_mode(0o777));
    for entry in fs::read_dir(&dir)?.flatten() {
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "parquet") && !entry.file_type().is_ok_and(|t| t.is_dir()) {
            fs::remove_file(&path).map_err(|e| format!("{}: {e}", path.display()))?;
        }
    }
    Ok(())
}
"""
assert s.count(old) == 1
s = s.replace(old, new)
open(p, "w").write(s)
print("cleanup added")
