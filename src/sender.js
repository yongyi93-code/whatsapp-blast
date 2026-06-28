'use strict';

const config = require('./config');

// 用收件人的变量字典替换模板中的 {列名} 占位符。
// 缺失的变量保留原样（如 {foo}），并返回缺失列表用于警告。
function renderTemplate(template, vars) {
  const missing = new Set();
  const text = String(template || '').replace(/\{([^{}]+)\}/g, (whole, key) => {
    const k = key.trim();
    if (Object.prototype.hasOwnProperty.call(vars, k) && vars[k] !== '') {
      return vars[k];
    }
    missing.add(k);
    return whole;
  });
  return { text, missing: [...missing] };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(min, max) {
  return Math.floor(min + Math.random() * Math.max(0, max - min));
}

// 群发循环。逐条替换变量、发送、随机延迟，并通过 onProgress 回调实时上报。
// 支持通过 shouldStop() 中途停止。
//
// 参数：
//   service       - WhatsAppService 实例
//   recipients    - recipients.js 解析出的收件人数组
//   template      - 消息模板字符串
//   attachments   - 附件绝对路径数组
//   options       - { delayMinMs, delayMaxMs, maxPerRun, onProgress, shouldStop }
async function runBlast(service, recipients, template, attachments, options = {}) {
  const delayMin = options.delayMinMs ?? config.delay.minMs;
  const delayMax = options.delayMaxMs ?? config.delay.maxMs;
  const maxPerRun = options.maxPerRun ?? config.maxPerRun;
  const onProgress = options.onProgress || (() => {});
  const shouldStop = options.shouldStop || (() => false);

  const queue = recipients.slice(0, maxPerRun);
  const truncated = recipients.length - queue.length;

  const results = [];
  let sent = 0;
  let failed = 0;
  let stopped = false;

  for (let i = 0; i < queue.length; i++) {
    if (shouldStop()) {
      stopped = true;
      break;
    }

    const r = queue[i];
    const { text, missing } = renderTemplate(template, r.vars);
    const base = {
      index: i + 1,
      total: queue.length,
      line: r.line,
      phone: r.phone,
    };

    try {
      await service.sendMessage(r.chatId, text, attachments);
      sent++;
      const entry = { ...base, status: 'sent', missing };
      results.push(entry);
      onProgress(entry);
    } catch (err) {
      failed++;
      const entry = { ...base, status: 'failed', error: err.message, missing };
      results.push(entry);
      onProgress(entry);
    }

    // 最后一条之后不再延迟
    if (i < queue.length - 1 && !shouldStop()) {
      await sleep(randomDelay(delayMin, delayMax));
    }
  }

  return { sent, failed, stopped, truncated, total: queue.length, results };
}

module.exports = { renderTemplate, runBlast };
