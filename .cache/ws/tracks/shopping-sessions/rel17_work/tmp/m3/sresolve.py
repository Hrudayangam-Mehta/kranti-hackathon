import sys
s = open(sys.argv[1]).read()
old = """<<<<<<< scur.rs
            let size = REGION.max(bytes);
            self.next = map_anonymous(size);
            self.regions.push((self.next, size));
=======
            let size = REGION.max(bytes).div_ceil(HUGE) * HUGE;
            self.next = region(size);
>>>>>>> sother.rs
"""
new = """            let size = REGION.max(bytes).div_ceil(HUGE) * HUGE;
            self.next = region(size);
            self.regions.push((self.next, size));
"""
assert s.count(old) == 1
s = s.replace(old, new)
old2 = """        self.next = ptr::null_mut();
        self.end = ptr::null_mut();
    }

    pub fn recycle("""
new2 = """        self.next = ptr::null_mut();
        self.end = ptr::null_mut();
        self.ready = ptr::null_mut();
    }

    pub fn recycle("""
assert s.count(old2) == 1
s = s.replace(old2, new2)
assert "<<<<<<<" not in s and ">>>>>>>" not in s and "=======" not in s
open(sys.argv[2], "w").write(s)
print("sink resolved")
