const { BrowserWindow, BrowserView } = require('electron');
const path = require('path');

module.exports = function (event, content) {
    this.printWin = new BrowserWindow({
        show: this.settings.devShowPrintWindow,
        width: 800,
        webPreferences: {
            nativeWindowOpen: true,
            webSecurity: false,
            allowRunningInsecureContent: true,
            enableRemoteModule: true,
            nodeIntegration: true,
            preload: path.join(this.dirPath, 'preload2.js'),
        },
    });
    const view = new BrowserView();
    this.printWin.setBrowserView(view);
    const contentBounds = this.printWin.getContentBounds();
    view.setBounds({ x: 0, y: 0, width: 800, height: contentBounds.height });
    view.setAutoResize({
        width: true,
        height: true,
    });
    this.printWin.loadURL('file://' + this.dirPath + '/receipt.html');

    console.log(`print`, this.dirPath);

    this.printWin.webContents.on('did-finish-load', () => {
        this.printWin.webContents.send('setContent', content);
    });
};
