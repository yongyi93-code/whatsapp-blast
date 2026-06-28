/* global io */
'use strict';

const socket = io();

const el = (id) => document.getElementById(id);
const statusEl = el('wa-status');
const qrBox = el('qr-box');
const btnSend = el('btn-send');
const btnStop = el('btn-stop');

let waReady = false;
let listReady = false;

const STATUS_TEXT = {
  offline: '连接中…',
  qr: '请扫码登录',
  authenticated: '登录成功，加载中…',
  ready: '已就绪 ✓',
  disconnected: '已断开',
};

function refreshSendBtn() {
  btnSend.disabled = !(waReady && listReady);
}

// ---- WhatsApp 状态 / 二维码 ----
socket.on('wa:status', (snap) => {
  statusEl.className = `status status-${snap.status}`;
  statusEl.textContent = STATUS_TEXT[snap.status] || snap.status;

  waReady = snap.status === 'ready';
  refreshSendBtn();

  if (snap.status === 'qr' && snap.qr) {
    qrBox.innerHTML = `<img src="${snap.qr}" alt="WhatsApp 登录二维码" />`;
  } else if (snap.status === 'ready') {
    qrBox.innerHTML = '<p class="hint ok">✓ 已登录，无需再扫码。</p>';
  } else if (snap.status === 'authenticated') {
    qrBox.innerHTML = '<p class="hint">登录成功，正在加载会话…</p>';
  }
});

// ---- 上传名单 ----
el('list-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('list', file);
  const box = el('list-result');
  box.textContent = '解析中…';

  try {
    const res = await fetch('/api/upload-list', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '上传失败');

    listReady = data.count > 0;
    refreshSendBtn();

    let html = `<span class="ok">✓ 共 ${data.count} 个有效收件人。</span>`;
    if (data.headers && data.headers.length) {
      html += `<div>可用变量：${data.headers.map((h) => `<code>{${h}}</code>`).join(' ')}</div>`;
    }
    if (data.errors && data.errors.length) {
      html += `<div class="err">⚠️ ${data.errors.length} 行被跳过：</div><ul>` +
        data.errors.slice(0, 10).map((er) => `<li>第 ${er.line} 行「${er.raw}」：${er.reason}</li>`).join('') +
        '</ul>';
    }
    box.innerHTML = html;
  } catch (err) {
    listReady = false;
    refreshSendBtn();
    box.innerHTML = `<span class="err">${err.message}</span>`;
  }
});

// ---- 上传附件 ----
el('attach-files').addEventListener('change', async (e) => {
  const files = e.target.files;
  if (!files.length) return;
  const fd = new FormData();
  for (const f of files) fd.append('attachments', f);
  const box = el('attach-list');
  box.textContent = '上传中…';
  try {
    const res = await fetch('/api/upload-attachments', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '上传失败');
    box.innerHTML = '附件：' + data.attachments.map((n) => `<code>${n}</code>`).join(' ');
  } catch (err) {
    box.innerHTML = `<span class="err">${err.message}</span>`;
  }
});

el('clear-attach').addEventListener('click', async () => {
  await fetch('/api/clear-attachments', { method: 'POST' });
  el('attach-list').innerHTML = '<span class="hint">附件已清空。</span>';
  el('attach-files').value = '';
});

// ---- 发送 ----
btnSend.addEventListener('click', async () => {
  const template = el('template').value;
  const delayMinMs = (Number(el('delay-min').value) || 8) * 1000;
  const delayMaxMs = (Number(el('delay-max').value) || 20) * 1000;

  if (delayMaxMs < delayMinMs) {
    alert('最大延迟不能小于最小延迟');
    return;
  }
  if (!template.trim()) {
    if (!confirm('消息内容为空，仅发送附件？')) return;
  }

  const res = await fetch('/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template, delayMinMs, delayMaxMs }),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || '发送失败');
    return;
  }
});

btnStop.addEventListener('click', () => {
  fetch('/api/stop', { method: 'POST' });
  btnStop.disabled = true;
});

// ---- 进度 ----
const progressBox = el('progress-box');
const progressFill = el('progress-fill');
const progressText = el('progress-text');
const resultsTable = el('results-table');
const resultsBody = resultsTable.querySelector('tbody');

socket.on('send:start', ({ total }) => {
  btnSend.disabled = true;
  btnStop.disabled = false;
  progressBox.classList.remove('hidden');
  resultsTable.classList.remove('hidden');
  resultsBody.innerHTML = '';
  progressFill.style.width = '0%';
  progressText.textContent = `0 / ${total}`;
});

socket.on('send:progress', (e) => {
  const pct = Math.round((e.index / e.total) * 100);
  progressFill.style.width = `${pct}%`;
  progressText.textContent = `${e.index} / ${e.total}`;

  const tr = document.createElement('tr');
  const statusLabel = e.status === 'sent' ? '已发送' : '失败';
  let note = '';
  if (e.error) note = e.error;
  else if (e.missing && e.missing.length) note = `缺变量：${e.missing.join(', ')}`;
  tr.innerHTML = `<td>${e.index}</td><td>${e.phone}</td>` +
    `<td class="${e.status}">${statusLabel}</td><td>${note}</td>`;
  resultsBody.appendChild(tr);
});

socket.on('send:done', (summary) => {
  btnStop.disabled = true;
  refreshSendBtn();
  let msg = `完成：成功 ${summary.sent}，失败 ${summary.failed}`;
  if (summary.stopped) msg += '（已手动停止）';
  if (summary.truncated > 0) msg += `，因超出单次上限有 ${summary.truncated} 条未发送，请分批。`;
  progressText.textContent = msg;
});

socket.on('send:error', ({ message }) => {
  btnStop.disabled = true;
  refreshSendBtn();
  progressText.textContent = `出错：${message}`;
});

// ---- 初始化默认值 ----
fetch('/api/config').then((r) => r.json()).then((cfg) => {
  el('delay-min').value = Math.round(cfg.delay.minMs / 1000);
  el('delay-max').value = Math.round(cfg.delay.maxMs / 1000);
});
