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

app.whenReady().then(async () => {
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
