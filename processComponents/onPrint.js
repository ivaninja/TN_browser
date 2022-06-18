const { BrowserWindow, BrowserView } = require('electron');
const path = require('path');

module.exports = function (event, content, printer="") {
    this.printWin = null;
    this.printWin = new BrowserWindow({
        show: this.settings.devShowPrintWindow,
        width: 700,
        webPreferences: {
            nativeWindowOpen: true,
            webSecurity: false,
            allowRunningInsecureContent: true,
            enableRemoteModule: true,
            nodeIntegration: true,
            preload: path.join(this.dirPath, 'preload2.js'),
        },
    });
    // const view = new BrowserView();
    // this.printWin.setBrowserView(view);
    // const contentBounds = this.printWin.getContentBounds();
    // console.log('contentBounds main');
    // console.log(contentBounds);
    // view.setBounds({
    //     x: 0,
    //     y: 0,
    //     width: contentBounds.width - 100,
    //     height: contentBounds.height,
    // });
    // view.setAutoResize({
    //     width: true,
    //     height: true,
    //     horizontal: true,
    //     vertical: true,
    // });
    this.printWin.loadURL('file://' + this.dirPath + '/receipt.html');
    // view.loadURL('file://' + this.dirPath + '/receipt.html');

    // console.log(`print`, this.dirPath);
    this.printWin.webContents.on('did-finish-load', () => {
        /*TEST WITHOUT FONT*/
        const newContent = content.replace('Monaco', this.settings.printFont);
        this.printWin.webContents.send('setContent', newContent, printer);
        
        //this.printWin.webContents.send('setContent', content);
    });
    // view.webContents.on('did-finish-load', () => {
    //     this.printWin.webContents.send('setContent', content);
    // });
};
