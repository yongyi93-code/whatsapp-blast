'use strict';

const path = require('path');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const config = require('./config');

// 封装 whatsapp-web.js client，并把状态/二维码通过回调暴露给上层。
class WhatsAppService {
  constructor() {
    this.client = null;
    this.status = 'offline'; // offline | qr | authenticated | ready | disconnected
    this.lastQrDataUrl = null;
    this.listeners = new Set(); // 状态变更监听者：fn(event)
  }

  // 订阅状态/二维码事件。返回取消订阅函数。
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(event) {
    for (const fn of this.listeners) {
      try {
        fn(event);
      } catch (_) {
        /* 忽略单个监听者错误 */
      }
    }
  }

  // 返回当前快照，给新连接的网页客户端用。
  snapshot() {
    return { status: this.status, qr: this.lastQrDataUrl };
  }

  isReady() {
    return this.status === 'ready';
  }

  init() {
    if (this.client) return;

    const puppeteerOpts = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    };
    // 指定系统浏览器（当自带 Chromium 不可用时）
    if (config.chromePath) {
      puppeteerOpts.executablePath = config.chromePath;
    }

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: path.resolve(config.authDir) }),
      puppeteer: puppeteerOpts,
      webVersionCache: { type: 'none' },
    });

    this.client.on('loading_screen', (percent, message) => {
      console.log(`[WA] 加载中 ${percent}% - ${message}`);
    });

    this.client.on('qr', async (qr) => {
      try {
        this.lastQrDataUrl = await qrcode.toDataURL(qr, { margin: 1, width: 320 });
      } catch (_) {
        this.lastQrDataUrl = null;
      }
      this.status = 'qr';
      this.emit({ type: 'status', status: this.status, qr: this.lastQrDataUrl });
    });

    this.client.on('authenticated', () => {
      console.log('[WA] authenticated');
      this.status = 'authenticated';
      this.lastQrDataUrl = null;
      this.emit({ type: 'status', status: this.status });
    });

    this.client.on('ready', () => {
      console.log('[WA] ready');
      this.status = 'ready';
      this.lastQrDataUrl = null;
      this.emit({ type: 'status', status: this.status });
    });

    this.client.on('auth_failure', (msg) => {
      this.status = 'disconnected';
      this.emit({ type: 'status', status: this.status, message: `认证失败：${msg}` });
    });

    this.client.on('disconnected', (reason) => {
      this.status = 'disconnected';
      this.lastQrDataUrl = null;
      this.emit({ type: 'status', status: this.status, message: `已断开：${reason}` });
    });

    this.client.initialize().catch((err) => {
      console.error('[WA] 初始化失败：', err.message);
      this.status = 'disconnected';
      this.emit({ type: 'status', status: this.status, message: `初始化失败：${err.message}` });
    });
  }

  // 应用退出时清理 Puppeteer/Chromium 子进程，避免残留进程。
  async shutdown() {
    if (!this.client) return;
    try {
      await this.client.destroy();
    } catch (_) {
      /* 退出阶段，忽略清理错误 */
    }
  }

  // 校验某个 chatId 是否为已注册的 WhatsApp 号码。
  async isRegistered(chatId) {
    const numberId = await this.client.getNumberId(chatId.replace('@c.us', ''));
    return Boolean(numberId);
  }

  // 发送一条消息：文字 + 可选附件列表（文件绝对路径）。
  // 有附件时，文字作为第一个附件的 caption；其余附件单独发。
  async sendMessage(chatId, text, attachmentPaths = []) {
    if (!this.client) throw new Error('WhatsApp 未初始化');

    if (!attachmentPaths || attachmentPaths.length === 0) {
      await this.client.sendMessage(chatId, text || '');
      return;
    }

    for (let i = 0; i < attachmentPaths.length; i++) {
      const media = MessageMedia.fromFilePath(attachmentPaths[i]);
      const options = i === 0 && text ? { caption: text } : {};
      await this.client.sendMessage(chatId, media, options);
    }
  }
}

module.exports = new WhatsAppService();
