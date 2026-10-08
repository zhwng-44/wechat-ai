import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";

const root = process.cwd();
const logDir = "C:/Users/ZhuanZ/AppData/Local/Temp/openclaw";
const logs = fs.readdirSync(logDir)
  .filter((name) => /^openclaw-\d{4}-\d{2}-\d{2}\.log$/.test(name))
  .sort();
let latestUrl = process.env.WEIXIN_QR_URL_B64
  ? Buffer.from(process.env.WEIXIN_QR_URL_B64, "base64").toString("utf8")
  : "";
let latestTime = latestUrl ? "current scan session" : "";

if (!latestUrl) {
  for (const name of logs) {
    const lines = fs.readFileSync(path.join(logDir, name), "utf8").split(/\r?\n/);
    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        const match = String(item["1"] ?? "").match(/二维码链接:\s*(https?:\/\/\S+)/);
        if (match) {
          latestUrl = match[1];
          latestTime = String(item.time ?? "");
        }
      } catch {}
    }
  }
}
if (!latestUrl) throw new Error("No Weixin QR URL found in the local OpenClaw log.");

const require = createRequire(import.meta.url);
const QRCode = require("./plugins/node_modules/qrcode-terminal/vendor/QRCode");
const QRErrorCorrectLevel = require("./plugins/node_modules/qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel");
const qr = new QRCode(-1, QRErrorCorrectLevel.L);
qr.addData(latestUrl);
qr.make();

const modules = qr.modules;
const quiet = 4;
const scale = 12;
const side = (modules.length + quiet * 2) * scale;
const rowBytes = side * 3;
const raw = Buffer.alloc((rowBytes + 1) * side);

for (let y = 0; y < side; y++) {
  const rowOffset = y * (rowBytes + 1);
  raw[rowOffset] = 0;
  const my = Math.floor(y / scale) - quiet;
  for (let x = 0; x < side; x++) {
    const mx = Math.floor(x / scale) - quiet;
    const dark = my >= 0 && mx >= 0 && my < modules.length && mx < modules.length && modules[my][mx];
    const color = dark ? 0 : 255;
    const pixel = rowOffset + 1 + x * 3;
    raw[pixel] = color;
    raw[pixel + 1] = color;
    raw[pixel + 2] = color;
  }
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  const check = Buffer.alloc(4);
  check.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, check]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(side, 0);
ihdr.writeUInt32BE(side, 4);
ihdr[8] = 8;
ihdr[9] = 2;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  pngChunk("IHDR", ihdr),
  pngChunk("IDAT", zlib.deflateSync(raw)),
  pngChunk("IEND", Buffer.alloc(0)),
]);

const output = path.join(root, "wechat-login-current.png");
fs.writeFileSync(output, png);
console.log("QR image generated from the newest local login session at " + latestTime);
