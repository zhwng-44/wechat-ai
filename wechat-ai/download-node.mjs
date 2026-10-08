// 下载 Node v24.21.0 Windows x64 便携版到工作区（避开沙箱对系统目录的限制）。
// 只做下载，解压交给 PowerShell 的 Expand-Archive。
import fs from 'node:fs';
import path from 'node:path';

const VERSION = 'v24.21.0';
const FILE = `node-${VERSION}-win-x64.zip`;
const dest = path.resolve(FILE);

const mirrors = [
  `https://registry.npmmirror.com/-/binary/node/${VERSION}/${FILE}`,
  `https://npmmirror.com/mirrors/node/${VERSION}/${FILE}`,
  `https://nodejs.org/dist/${VERSION}/${FILE}`,
];

console.log(`目标文件: ${dest}`);

let ok = false;
for (const url of mirrors) {
  console.log(`\n尝试: ${url}`);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 600000); // 10 分钟
  try {
    const res = await fetch(url, { signal: ac.signal });
    console.log(`  HTTP ${res.status}`);
    if (!res.ok) { clearTimeout(timer); continue; }
    const total = Number(res.headers.get('content-length') || 0);
    console.log(`  大小: ${total ? (total / 1024 / 1024).toFixed(1) + ' MB' : '(未知)'}`);

    const fh = fs.openSync(dest, 'w');
    let written = 0;
    let lastPct = -1;
    for await (const chunk of res.body) {
      fs.writeSync(fh, chunk);
      written += chunk.length;
      if (total) {
        const pct = Math.floor((written / total) * 100);
        if (pct >= lastPct + 20) { lastPct = pct; console.log(`  进度 ${pct}%`); }
      }
    }
    fs.closeSync(fh);
    console.log(`  下载完成: ${(written / 1024 / 1024).toFixed(1)} MB`);
    ok = true;
    break;
  } catch (e) {
    console.log(`  ERR ${e.name}: ${e.message}`);
    try { if (fs.existsSync(dest)) fs.unlinkSync(dest); } catch {}
  } finally {
    clearTimeout(timer);
  }
}

if (!ok) { console.log('\n=== 所有镜像都失败 ==='); process.exit(1); }
const st = fs.statSync(dest);
console.log(`\n=== 成功 ===  ${dest}  ${(st.size / 1024 / 1024).toFixed(1)} MB`);
