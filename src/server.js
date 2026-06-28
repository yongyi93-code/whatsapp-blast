'use strict';

const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const multer = require('multer');
const { Server } = require('socket.io');

const config = require('./config');
const whatsapp = require('./whatsapp');
const recipients = require('./recipients');
const sender = require('./sender');

const uploadDir = path.resolve(config.uploadDir);
fs.mkdirSync(uploadDir, { recursive: true });

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ---- 文件上传 ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/[^\w.\-]/g, '_');
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

app.use(express.json());
app.use(express.static(path.resolve(__dirname, '..', 'public')));

// 当前一次群发的运行态（单用户工具，单任务即可）
const runState = {
  recipients: [],
  errors: [],
  headers: [],
  attachments: [], // { path, originalname }
  running: false,
  stopRequested: false,
};

// 解析上传的 Excel/CSV 名单
app.post('/api/upload-list', upload.single('list'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未收到文件' });
  try {
    const parsed = recipients.parseFile(req.file.path, config.defaultCountryCode);
    runState.recipients = parsed.recipients;
    runState.errors = parsed.errors;
    runState.headers = parsed.headers;
    fs.unlink(req.file.path, () => {}); // 解析完即删
    res.json({
      count: parsed.recipients.length,
      headers: parsed.headers,
      errors: parsed.errors,
      preview: parsed.recipients.slice(0, 5),
    });
  } catch (err) {
    res.status(500).json({ error: `解析失败：${err.message}` });
  }
});

// 上传附件（图片/文件），可多个
app.post('/api/upload-attachments', upload.array('attachments', 10), (req, res) => {
  const files = (req.files || []).map((f) => ({
    path: f.path,
    originalname: Buffer.from(f.originalname, 'latin1').toString('utf8'),
  }));
  runState.attachments.push(...files);
  res.json({ attachments: runState.attachments.map((f) => f.originalname) });
});

// 清空附件
app.post('/api/clear-attachments', (req, res) => {
  for (const f of runState.attachments) fs.unlink(f.path, () => {});
  runState.attachments = [];
  res.json({ ok: true });
});

// 开始群发
app.post('/api/send', async (req, res) => {
  if (!whatsapp.isReady()) return res.status(400).json({ error: 'WhatsApp 未就绪，请先扫码登录' });
  if (runState.running) return res.status(400).json({ error: '已有群发任务在进行中' });
  if (runState.recipients.length === 0) return res.status(400).json({ error: '请先上传收件人名单' });

  const template = String(req.body.template || '');
  const delayMinMs = Number(req.body.delayMinMs) || config.delay.minMs;
  const delayMaxMs = Number(req.body.delayMaxMs) || config.delay.maxMs;

  runState.running = true;
  runState.stopRequested = false;
  res.json({ ok: true, total: Math.min(runState.recipients.length, config.maxPerRun) });

  const attachmentPaths = runState.attachments.map((f) => f.path);

  io.emit('send:start', {
    total: Math.min(runState.recipients.length, config.maxPerRun),
  });

  try {
    const summary = await sender.runBlast(whatsapp, runState.recipients, template, attachmentPaths, {
      delayMinMs,
      delayMaxMs,
      maxPerRun: config.maxPerRun,
      onProgress: (entry) => io.emit('send:progress', entry),
      shouldStop: () => runState.stopRequested,
    });
    io.emit('send:done', summary);
  } catch (err) {
    io.emit('send:error', { message: err.message });
  } finally {
    runState.running = false;
  }
});

// 停止群发
app.post('/api/stop', (req, res) => {
  runState.stopRequested = true;
  res.json({ ok: true });
});

// 配置（给前端展示默认值）
app.get('/api/config', (req, res) => {
  res.json({
    defaultCountryCode: config.defaultCountryCode,
    delay: config.delay,
    maxPerRun: config.maxPerRun,
  });
});

// ---- socket.io：推送 WhatsApp 状态 / 二维码 ----
io.on('connection', (socket) => {
  socket.emit('wa:status', whatsapp.snapshot());
});

whatsapp.subscribe((event) => {
  io.emit('wa:status', whatsapp.snapshot());
  if (event.message) io.emit('wa:message', { message: event.message });
});

whatsapp.init();

const ready = new Promise((resolve) => {
  server.listen(config.port, () => {
    console.log(`\n  WhatsApp 群发工具已启动：http://localhost:${config.port}\n`);
    resolve({ port: config.port });
  });
});

module.exports = { server, ready, shutdown: () => whatsapp.shutdown() };
