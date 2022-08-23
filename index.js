const { app, BrowserWindow } = require('electron');
const Store = require('electron-store');
const path = require('path');
const pkg = require('./package');

if (require('electron-squirrel-startup')) return app.quit();

const createWindow = () => {
  const win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    show: false,
  });

  win.maximize();
  win.show();

  if (process.env.NODE_ENV === 'development') {
    win.loadURL(path.join(`file://${__dirname}`,`./index.html`))
  } else {
    win.loadURL(path.join(`file://${__dirname}`,`./build/index.html`))
  }

  win.webContents.openDevTools();
};

app.whenReady().then(() => {
  createWindow();
  Store.initRenderer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
