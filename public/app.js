/* global io */
'use strict';

// ---- 中英文翻译 ----
const TRANSLATIONS = {
  zh: {
    'title': 'WhatsApp 群发工具',
    'status.offline': '连接中…',
    'status.qr': '请扫码登录',
    'status.authenticated': '登录成功，加载中…',
    'status.ready': '已就绪 ✓',
    'status.disconnected': '已断开',
    'step1.title': '① 扫码登录',
    'step1.loading': '正在启动 WhatsApp，请稍候…',
    'step1.hint': '用手机 WhatsApp → 设置 → 已关联的设备 → 关联设备，扫描上方二维码。',
    'step1.loggedIn': '✓ 已登录，无需再扫码。',
    'step1.loading2': '登录成功，正在加载会话…',
    'step2.title': '② 上传收件人名单（Excel / CSV）',
    'step2.hint': '第一列为手机号（建议含国家码，如 60123456789），其余列为变量（列名即变量名，如 {name}）。',
    'step3.title': '③ 编写消息',
    'step3.hint': '用 {列名} 插入变量，例如：你好 {name}，你的订单 {order} 已发货。',
    'step3.placeholder': '在这里输入要发送的消息…',
    'step3.attachLabel': '附件（图片 / 文件，可多选）：',
    'step3.clearAttach': '清空附件',
    'step3.hdPhoto': '📷 发送高清图片（以文件方式发送，保留原图质量）',
    'step4.title': '④ 发送',
    'step4.delayLabel': '每条间隔随机延迟：',
    'step4.seconds': '秒',
    'step4.delayHint': '（延迟越长越不易被封号）',
    'step4.btnSend': '开始发送',
    'step4.btnStop': '停止',
    'table.no': '#',
    'table.phone': '号码',
    'table.status': '状态',
    'table.note': '备注',
    'footer': '⚠️ 仅向已同意接收的联系人发送。非官方网页自动化群发存在封号风险，请控制频率与数量。',
    'status.sent': '已发送',
    'status.failed': '失败',
    'parsing': '解析中…',
    'uploading': '上传中…',
    'attachCleared': '附件已清空。',
    'attachLabel': '附件：',
    'validRecipients': '✓ 共 {count} 个有效收件人。',
    'availableVars': '可用变量：',
    'skippedRows': '⚠️ {count} 行被跳过：',
    'row': '第',
    'rowSuffix': '行',
    'alertMaxDelay': '最大延迟不能小于最小延迟',
    'confirmEmptyMsg': '消息内容为空，仅发送附件？',
    'sendFailed': '发送失败',
    'done': '完成：成功 {sent}，失败 {failed}',
    'stopped': '（已手动停止）',
    'truncated': '，因超出单次上限有 {n} 条未发送，请分批。',
    'error': '出错：',
  },
  en: {
    'title': 'WhatsApp Blast Tool',
    'status.offline': 'Connecting…',
    'status.qr': 'Please scan QR code',
    'status.authenticated': 'Authenticated, loading…',
    'status.ready': 'Ready ✓',
    'status.disconnected': 'Disconnected',
    'step1.title': '① Scan QR to Login',
    'step1.loading': 'Starting WhatsApp, please wait…',
    'step1.hint': 'Open WhatsApp on your phone → Settings → Linked Devices → Link a Device, then scan the QR code above.',
    'step1.loggedIn': '✓ Already logged in.',
    'step1.loading2': 'Authenticated, loading session…',
    'step2.title': '② Upload Recipients (Excel / CSV)',
    'step2.hint': 'First column: phone number (with country code, e.g. 60123456789). Other columns are variables (column name = variable name, e.g. {name}).',
    'step3.title': '③ Write Message',
    'step3.hint': 'Use {column_name} to insert variables, e.g.: Hello {name}, your order {order} has been shipped.',
    'step3.placeholder': 'Type your message here…',
    'step3.attachLabel': 'Attachments (images / files, multiple allowed):',
    'step3.clearAttach': 'Clear Attachments',
    'step3.hdPhoto': '📷 Send HD Photos (sent as file, preserves original quality)',
    'step4.title': '④ Send',
    'step4.delayLabel': 'Random delay between messages:',
    'step4.seconds': 'sec',
    'step4.delayHint': '(Longer delay reduces ban risk)',
    'step4.btnSend': 'Start Sending',
    'step4.btnStop': 'Stop',
    'table.no': '#',
    'table.phone': 'Phone',
    'table.status': 'Status',
    'table.note': 'Note',
    'footer': '⚠️ Only send to contacts who have consented. Unofficial WhatsApp automation carries ban risk — keep volume and frequency low.',
    'status.sent': 'Sent',
    'status.failed': 'Failed',
    'parsing': 'Parsing…',
    'uploading': 'Uploading…',
    'attachCleared': 'Attachments cleared.',
    'attachLabel': 'Attachments: ',
    'validRecipients': '✓ {count} valid recipients.',
    'availableVars': 'Available variables: ',
    'skippedRows': '⚠️ {count} rows skipped:',
    'row': 'Row',
    'rowSuffix': '',
    'alertMaxDelay': 'Max delay must be greater than min delay',
    'confirmEmptyMsg': 'Message is empty. Send attachments only?',
    'sendFailed': 'Send failed',
    'done': 'Done: {sent} sent, {failed} failed',
    'stopped': ' (manually stopped)',
    'truncated': ', {n} unsent due to per-run limit — please send in batches.',
    'error': 'Error: ',
  },
};

let lang = localStorage.getItem('lang') || 'zh';

function t(key, vars = {}) {
  let str = TRANSLATIONS[lang][key] || TRANSLATIONS['zh'][key] || key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(`{${k}}`, v);
  }
  return str;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.getElementById('lang-toggle').textContent = lang === 'zh' ? 'EN' : '中文';
  document.documentElement.lang = lang;
  // update dynamic status text
  const snap = lastSnap;
  if (snap) updateStatus(snap);
}

document.getElementById('lang-toggle').addEventListener('click', () => {
  lang = lang === 'zh' ? 'en' : 'zh';
  localStorage.setItem('lang', lang);
  applyTranslations();
});

// ---- App ----
const socket = io();
const el = (id) => document.getElementById(id);
const statusEl = el('wa-status');
const qrBox = el('qr-box');
const btnSend = el('btn-send');
const btnStop = el('btn-stop');

let waReady = false;
let listReady = false;
let lastSnap = null;

function refreshSendBtn() {
  btnSend.disabled = !(waReady && listReady);
}

function updateStatus(snap) {
  statusEl.className = `status status-${snap.status}`;
  statusEl.textContent = t(`status.${snap.status}`) || snap.status;

  waReady = snap.status === 'ready';
  refreshSendBtn();

  if (snap.status === 'qr' && snap.qr) {
    qrBox.innerHTML = `<img src="${snap.qr}" alt="WhatsApp QR" />`;
  } else if (snap.status === 'ready') {
    qrBox.innerHTML = `<p class="hint ok">${t('step1.loggedIn')}</p>`;
  } else if (snap.status === 'authenticated') {
    qrBox.innerHTML = `<p class="hint">${t('step1.loading2')}</p>`;
  }
}

// ---- WhatsApp 状态 / 二维码 ----
socket.on('wa:status', (snap) => {
  lastSnap = snap;
  updateStatus(snap);
});

// ---- 上传名单 ----
el('list-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('list', file);
  const box = el('list-result');
  box.textContent = t('parsing');

  try {
    const res = await fetch('/api/upload-list', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t('sendFailed'));

    listReady = data.count > 0;
    refreshSendBtn();

    let html = `<span class="ok">${t('validRecipients', { count: data.count })}</span>`;
    if (data.headers && data.headers.length) {
      html += `<div>${t('availableVars')}${data.headers.map((h) => `<code>{${h}}</code>`).join(' ')}</div>`;
    }
    if (data.errors && data.errors.length) {
      html += `<div class="err">${t('skippedRows', { count: data.errors.length })}</div><ul>` +
        data.errors.slice(0, 10).map((er) => `<li>${t('row')} ${er.line}${t('rowSuffix')} 「${er.raw}」：${er.reason}</li>`).join('') +
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
  box.textContent = t('uploading');
  try {
    const res = await fetch('/api/upload-attachments', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t('sendFailed'));
    box.innerHTML = t('attachLabel') + data.attachments.map((n) => `<code>${n}</code>`).join(' ');
  } catch (err) {
    box.innerHTML = `<span class="err">${err.message}</span>`;
  }
});

el('clear-attach').addEventListener('click', async () => {
  await fetch('/api/clear-attachments', { method: 'POST' });
  el('attach-list').innerHTML = `<span class="hint">${t('attachCleared')}</span>`;
  el('attach-files').value = '';
});

// ---- 发送 ----
btnSend.addEventListener('click', async () => {
  const template = el('template').value;
  const delayMinMs = (Number(el('delay-min').value) || 8) * 1000;
  const delayMaxMs = (Number(el('delay-max').value) || 20) * 1000;
  const hdPhoto = el('hd-photo').checked;

  if (delayMaxMs < delayMinMs) {
    alert(t('alertMaxDelay'));
    return;
  }
  if (!template.trim()) {
    if (!confirm(t('confirmEmptyMsg'))) return;
  }

  const res = await fetch('/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template, delayMinMs, delayMaxMs, hdPhoto }),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || t('sendFailed'));
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
  const statusLabel = e.status === 'sent' ? t('status.sent') : t('status.failed');
  let note = '';
  if (e.error) note = e.error;
  else if (e.missing && e.missing.length) note = `${lang === 'zh' ? '缺变量' : 'Missing vars'}：${e.missing.join(', ')}`;
  tr.innerHTML = `<td>${e.index}</td><td>${e.phone}</td>` +
    `<td class="${e.status}">${statusLabel}</td><td>${note}</td>`;
  resultsBody.appendChild(tr);
});

socket.on('send:done', (summary) => {
  btnStop.disabled = true;
  refreshSendBtn();
  let msg = t('done', { sent: summary.sent, failed: summary.failed });
  if (summary.stopped) msg += t('stopped');
  if (summary.truncated > 0) msg += t('truncated', { n: summary.truncated });
  progressText.textContent = msg;
});

socket.on('send:error', ({ message }) => {
  btnStop.disabled = true;
  refreshSendBtn();
  progressText.textContent = t('error') + message;
});

// ---- 初始化 ----
fetch('/api/config').then((r) => r.json()).then((cfg) => {
  el('delay-min').value = Math.round(cfg.delay.minMs / 1000);
  el('delay-max').value = Math.round(cfg.delay.maxMs / 1000);
});

applyTranslations();
