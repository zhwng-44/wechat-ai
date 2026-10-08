// 直接复现 OpenClaw 的 sqlite staging 分配流程，定位失败的那一步。
const lines = [];
const log = (...a) => { const s = a.join(' '); lines.push(s); console.log(s); };

const DIST = 'file:///D:/%E6%96%B0%E5%BB%BA%E6%96%87%E4%BB%B6%E5%A4%B9%20(10)/wechat-ai/npm-global/node_modules/openclaw/dist/';

try {
  const staging = await import(DIST + 'sqlite-snapshot-staging-C3ICAs3m.mjs');
  log('模块加载成功，导出:', Object.keys(staging).join(', '));

  const fs = await import('node:fs');
  const path = await import('node:path');

  // 1. 解析 staging root
  let root;
  try {
    root = staging.resolvePrivateSqliteSnapshotStagingRoot();
    log('staging root =', root);
  } catch (e) {
    log('resolvePrivateSqliteSnapshotStagingRoot FAIL:', e.message);
  }

  if (root) {
    log('root 存在?', fs.existsSync(root));
    // 2. 试 createPrivateSqliteTempDirectorySync
    try {
      const dir = staging.createPrivateSqliteTempDirectorySync(root, 'probe-');
      log('私有临时目录创建成功:', dir);
      log('  目录存在?', fs.existsSync(dir));
      // 3. 在里面试建文件
      try {
        const f = path.join(dir, 'probe.txt');
        fs.writeFileSync(f, 'hi');
        log('  写入普通文件 OK');
      } catch (e) { log('  写入普通文件 FAIL:', e.code, e.message); }
      // 4. 试建 sqlite
      try {
        const { DatabaseSync } = await import('node:sqlite');
        const db = new DatabaseSync(path.join(dir, 'owner.sqlite'));
        db.exec('PRAGMA journal_mode=delete');
        db.close();
        log('  在该目录建 sqlite OK');
      } catch (e) { log('  在该目录建 sqlite FAIL:', e.code ?? '', e.message); }
    } catch (e) {
      log('createPrivateSqliteTempDirectorySync FAIL:', e.code ?? '', e.message);
      if (e.cause) log('  cause:', e.cause.message ?? e.cause);
    }
  }
} catch (e) {
  log('加载模块 FAIL:', e.message);
}

const fs2 = await import('node:fs');
fs2.writeFileSync('sqlite-probe.txt', lines.join('\n'), 'utf8');
