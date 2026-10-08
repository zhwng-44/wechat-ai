// 查询 Node.js 24 可用版本。输出用 console.log（此前验证 node 的 stdout 可被 PowerShell 捕获）。
const out = [];
const log = (...a) => { const s = a.join(' '); out.push(s); console.log(s); };

process.on('uncaughtException', (e) => { log('UNCAUGHT: ' + e.message); process.exit(2); });
process.on('unhandledRejection', (e) => { log('UNHANDLED: ' + (e && e.message)); process.exit(3); });

async function getJson(url, ms = 25000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

const sources = [
  ['npmmirror', 'https://registry.npmmirror.com/-/binary/node/index.json'],
  ['nodejs.org', 'https://nodejs.org/dist/index.json'],
];

let done = false;
for (const [name, url] of sources) {
  log(`\n=== ${name} ===`);
  try {
    const j = await getJson(url);
    const list = Array.isArray(j) ? j : (j.data ?? []);
    log(`  总版本数: ${list.length}`);
    if (!list.length) { log('  空列表，跳过'); continue; }
    const v24 = list.filter((x) => String(x.version).startsWith('v24.'));
    log(`  v24.x 数量: ${v24.length}`);
    for (const x of v24.slice(0, 6)) log(`     ${x.version}   lts=${x.lts === false ? 'false' : (x.lts || '-')}   ${x.date || ''}`);
    const lts = v24.find((x) => x.lts);
    const newest = v24[0];
    log(`  -> 最新 v24 LTS : ${lts ? lts.version : '(无)'}`);
    log(`  -> v24 列表首位 : ${newest ? newest.version : '(无)'}`);
    log(`  -> 选用        : ${(lts || newest || {}).version}`);
    done = true;
    break;
  } catch (e) {
    log(`  ERR ${e.name}: ${e.message}`);
  }
}
log(done ? '\n=== 成功 ===' : '\n=== 全部数据源失败 ===');
