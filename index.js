const { app, BrowserWindow } = require('electron')

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        kiosk: true,
        title: 'TN-Browser',
        icon: './assets/icon.png',
        webPreferences: {
            nodeIntegration: true,
        }
    })
    win.webContents.print({ silent: true })
    win.loadFile('./splash.html');
    setTimeout(() => {
        win.loadURL('https://damfastore-magdeburg.kassesvn.tn-rechenzentrum1.de/');
    }, 3000)
}

app.whenReady().then(createWindow)