// 下载并审阅腾讯官方微信插件的包内容（先看清楚再执行）。
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const out = [];
const log = (...a) => { const s = a.join(' '); out.push(s); console.log(s); };

const REG = 'https://registry.npmmirror.com/';
const PKG = '@tencent-weixin/openclaw-weixin-cli';

async function getJson(url, ms = 20000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

const meta = await getJson(REG + PKG.replace('/', '%2f'));
const latest = meta['dist-tags'].latest;
const v = meta.versions[latest];
log(`包: ${PKG}@${latest}`);
log(`tarball: ${v.dist.tarball}`);
log(`bin: ${JSON.stringify(v.bin)}`);
log(`main: ${v.main}`);
log(`scripts: ${JSON.stringify(v.scripts ?? {})}`);
log(`dependencies: ${JSON.stringify(v.dependencies ?? {})}`);
log(`description: ${v.description}`);
log(`_npmUser: ${JSON.stringify(v._npmUser)}`);

// 下载 tarball 并列出文件（不安装）
const ac = new AbortController();
const t = setTimeout(() => ac.abort(), 120000);
let buf;
try {
  const r = await fetch(v.dist.tarball, { signal: ac.signal });
  buf = Buffer.from(await r.arrayBuffer());
  log(`\ntarball 大小: ${(buf.length / 1024).toFixed(1)} KB`);
} finally { clearTimeout(t); }

// 简易 gzip + tar 解析：只列出文件名和抽取 package.json
const tar = zlib.gunzipSync(buf);
const files = [];
let pos = 0;
let pkgJson = null;
while (pos + 512 <= tar.length) {
  const name = tar.subarray(pos, pos + 100).toString('utf8').replace(/\0.*$/, '');
  if (!name) { pos += 512; continue; }
  const sizeStr = tar.subarray(pos + 124, pos + 136).toString('utf8').replace(/\0.*$/, '').trim();
  const size = parseInt(sizeStr, 8) || 0;
  const content = tar.subarray(pos + 512, pos + 512 + size);
  files.push(`${name}  (${size} B)`);
  if (name.endsWith('package.json') && name.split('/').length <= 2) {
    try { pkgJson = JSON.parse(content.toString('utf8')); } catch {}
  }
  pos += 512 + Math.ceil(size / 512) * 512;
}
log(`\n=== 包内文件（共 ${files.length} 个）===`);
for (const f of files.slice(0, 60)) log('  ' + f);
if (files.length > 60) log(`  ... 还有 ${files.length - 60} 个`);
if (pkgJson) {
  log('\n=== 包内 package.json ===');
  log(JSON.stringify(pkgJson, null, 2).slice(0, 2500));
}
fs.writeFileSync('plugin-inspect.txt', out.join('\n'), 'utf8');
