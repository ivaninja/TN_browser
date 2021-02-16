const {BrowserWindow} = require('electron');
const path = require('path');

module.exports = function (event, content) {

    this.printWin = new BrowserWindow({
        show: this.settings.devShowPrintWindow,
        webPreferences: {
            nativeWindowOpen: true,
            webSecurity: false,
            allowRunningInsecureContent: true,
            enableRemoteModule: true,
            nodeIntegration: true,
            preload: path.join(this.dirPath, 'preload2.js'),
        }
    });

    this.printWin.loadURL('file://' + this.dirPath + '/receipt.html');

    console.log(`print`, this.dirPath)

    this.printWin.webContents.on('did-finish-load', () => {
        this.printWin.webContents.send('setContent', content);
    });

};
