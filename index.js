const { app, BrowserWindow } = require('electron');
const path = require('path');
const { ipcMain } = require('electron');

let win, printWin;
function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    kiosk: false,
    title: 'TN-Browser',
    icon: './assets/favicon.ico',
    webPreferences: {
      nativeWindowOpen: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js'), // use a preload script
    },
  });
  win.loadFile('./splash.html');
  setTimeout(() => {
    win.loadURL('https://damfastore-magdeburg.kassesvn.tn-rechenzentrum1.de/');
  }, 3000);
}
ipcMain.on('print', (event, content) => {
  printWin = new BrowserWindow({
    show: false,
    webPreferences: {
      nativeWindowOpen: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      enableRemoteModule: true,
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload2.js'),
    },
  });
  printWin.loadURL('file://' + __dirname + '/receipt.html');
  printWin.webContents.on('did-finish-load', () => {
    printWin.webContents.send('setContent', content);
  });
});

ipcMain.on('readyToPrint', (event) => {
  printWin.webContents.print({ silent: true });
});

app.whenReady().then(createWindow);
