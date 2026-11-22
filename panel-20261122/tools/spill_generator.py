#!/usr/bin/env python3
"""Build a disk-buffered wrapper around the unchanged official row generator."""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parent.parent
source = root / 'kit/generator'
dest = root / 'tools/generator-spill'
(dest / 'src').mkdir(parents=True, exist_ok=True)
for name in ('Cargo.toml', 'Cargo.lock'):
    shutil.copy2(source / name, dest / name)
for path in (source / 'src').glob('*.rs'):
    shutil.copy2(path, dest / 'src' / path.name)
path = dest / 'src/main.rs'
text = path.read_text().replace('use std::io::{self, BufWriter, Write};', 'use std::io::{self, BufWriter, Write, Read, Seek, SeekFrom};')
start = text.index('fn run(arguments: &Arguments)')
end = text.index('\nfn remove_surplus_parts', start)
replacement = r'''
struct PartIndex {
    offset: u64,
    rows: usize,
    bytes: usize,
}

struct ShardIndex {
    path: PathBuf,
    groups: [Vec<PartIndex>; 3],
}

fn spill_shard(path: PathBuf, shard: Shard) -> io::Result<ShardIndex> {
    let mut writer = BufWriter::with_capacity(1 << 20, File::create(&path)?);
    let mut groups: [Vec<PartIndex>; 3] = std::array::from_fn(|_| Vec::new());
    let mut offset = 0u64;
    for (group, parts) in [shard.events, shard.clicks, shard.links].into_iter().enumerate() {
        for (bytes, starts) in parts.bytes.into_iter().zip(parts.starts) {
            groups[group].push(PartIndex { offset, rows: starts.len(), bytes: bytes.len() });
            for at in &starts { writer.write_all(&at.to_le_bytes())?; }
            writer.write_all(&bytes)?;
            offset += (starts.len() as u64) * 4 + bytes.len() as u64;
        }
    }
    writer.flush()?;
    Ok(ShardIndex { path, groups })
}

fn restore_part(index: &ShardIndex, group: usize, part: usize) -> io::Result<Parts> {
    let block = &index.groups[group][part];
    let mut file = File::open(&index.path)?;
    file.seek(SeekFrom::Start(block.offset))?;
    let mut starts = vec![0u8; block.rows * 4];
    file.read_exact(&mut starts)?;
    let mut restored = Parts::new(&[1.0]);
    restored.starts[0] = starts.chunks_exact(4).map(|b| u32::from_le_bytes(b.try_into().unwrap())).collect();
    drop(starts);
    restored.bytes[0].resize(block.bytes, 0);
    file.read_exact(&mut restored.bytes[0])?;
    Ok(restored)
}

fn run(arguments: &Arguments) -> io::Result<()> {
    let dataset = Dataset::plan(arguments.seed, arguments.events, arguments.clicks);
    let output = &arguments.output;
    for folder in ["events", "clicks", "links"] { fs::create_dir_all(output.join(folder))?; }
    let spool = output.join("generator-spool");
    fs::create_dir_all(&spool)?;
    let indices: Vec<Mutex<Option<io::Result<ShardIndex>>>> = dataset.shards.iter().map(|_| Mutex::new(None)).collect();
    let next = AtomicUsize::new(0);
    thread::scope(|scope| {
        for _ in 0..arguments.threads {
            let next = &next;
            let indices = &indices;
            let spool = &spool;
            let dataset = &dataset;
            scope.spawn(move || loop {
                let at = next.fetch_add(1, Ordering::Relaxed);
                let Some(users) = dataset.shards.get(at) else { break };
                let shard = generate_shard(dataset, users.clone());
                *indices[at].lock().unwrap() = Some(spill_shard(spool.join(format!("{at:04}.bin")), shard));
            });
        }
    });
    let indices: Vec<ShardIndex> = indices.into_iter().map(|x| x.into_inner().unwrap().unwrap()).collect::<io::Result<_>>()?;
    // Keep the exact official shard order and random shuffle for every part.
    // Read one part at a time to bound the row buffer by the largest input file.
    for (group, (folder, count, stream, header)) in [
        ("events", dataset.event_parts.len(), Stream::ShuffleEvents, EVENT_HEADER),
        ("clicks", dataset.click_parts.len(), Stream::ShuffleClicks, CLICK_HEADER),
        ("links", dataset.link_parts.len(), Stream::ShuffleLinks, LINK_HEADER),
    ].into_iter().enumerate() {
        for part in 0..count {
            let restored: Vec<Parts> = indices.iter().map(|idx| restore_part(idx, group, part)).collect::<io::Result<_>>()?;
            let refs: Vec<&Parts> = restored.iter().collect();
            let mut random = Random::new(dataset.seed, stream, part as u64);
            write_part(&output.join(folder).join(format!("part-{part:05}.csv")), header, &refs, 0, &mut random)?;
        }
        remove_surplus_parts(&output.join(folder), count)?;
    }
    write_lookups(output, &dataset)?;
    fs::remove_dir_all(spool)?;
    Ok(())
}
'''
path.write_text(text[:start] + replacement + text[end:])
print(dest)
