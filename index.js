const { app, BrowserWindow } = require('electron')
const path = require("path");
const { ipcMain  } = require('electron');
console.log(BrowserWindow)
let win;
function createWindow() {
     win = new BrowserWindow({
        width: 800,
        height: 600,
        kiosk: true,
        title: 'TN-Browser',
        icon: './assets/favicon.ico',
        webPreferences: {
            webSecurity: false,
            allowRunningInsecureContent: true,
            enableRemoteModule: true,
            preload: path.join(__dirname, "preload.js") // use a preload script
        }
    })
    win.loadFile('./splash.html');
    setTimeout(() => {
        win.loadURL('https://damfastore-magdeburg.kassesvn.tn-rechenzentrum1.de/');
    }, 3000)
}
ipcMain.on('print',()=>{
    win.webContents.print({ silent: true })
} )
app.whenReady().then(createWindow)