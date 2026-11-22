// CPU hog used by the determinism-under-load test (pinned to the bot's CPU by the caller); exits after N s.
const end = Date.now() + Number(process.argv[2] || 60) * 1000
let x = 0
while (Date.now() < end) for (let i = 0; i < 1e6; i++) x += Math.sqrt(i)
