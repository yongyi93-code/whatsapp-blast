'use strict';

const path = require('path');
const { app, BrowserWindow } = require('electron');

app.setName('WhatsApp群发工具');

let mainWindow = null;
let backend = null;

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    title: 'WhatsApp 群发工具',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(`http://localhost:${port}`);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function findChromePath() {
  // 打包后 node_modules 被解压到 app.asar.unpacked 里
  const unpackedModules = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules')
    : path.join(__dirname, '..', 'node_modules');

  const fs = require('fs');

  // puppeteer 新版 (.cache) 和旧版 (.local-chromium) 的路径都试一下
  const cacheDirs = [
    path.join(unpackedModules, 'puppeteer', '.local-chromium'),
    path.join(unpackedModules, 'puppeteer', '.cache', 'chrome'),
    path.join(unpackedModules, '.cache', 'puppeteer', 'chrome'),
  ];

  for (const cacheDir of cacheDirs) {
    if (!fs.existsSync(cacheDir)) continue;
    // 找里面的 chrome.exe (Windows) 或 chrome (Mac/Linux)
    const exeName = process.platform === 'win32' ? 'chrome.exe' : 'chrome';
    const found = walkFind(cacheDir, exeName, fs);
    if (found) return found;
  }
  return null;
}

function walkFind(dir, target, fs, depth = 0) {
  if (depth > 6) return null;
  try {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (entry === target) return full;
      try {
        if (fs.statSync(full).isDirectory()) {
          const result = walkFind(full, target, fs, depth + 1);
          if (result) return result;
        }
      } catch (_) {}
    }
  } catch (_) {}
  return null;
}

app.whenReady().then(async () => {
  // 找到打包后 Chromium 的路径，通过环境变量告知后端
  if (!process.env.CHROME_PATH) {
    const chromePath = findChromePath();
    if (chromePath) process.env.CHROME_PATH = chromePath;
  }

  // 在 Electron 主进程里直接启动现有的 Express + socket.io 服务。
  backend = require(path.join(__dirname, '..', 'src', 'server.js'));
  const { port } = await backend.ready;
  createWindow(port);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', async (event) => {
  if (!backend) return;
  event.preventDefault();
  await backend.shutdown();
  backend = null;
  app.exit(0);
});
