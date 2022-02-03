const {autoUpdater} = require("electron-updater");

module.exports = function () {
    this.autoUpdater = autoUpdater;

    if (this.isDev || !this.isOnline) {
        this.start({});
        return
    }

    this.autoUpdater.on('checking-for-update', () => {
        this.updateWin.webContents.send('message', {action: 'checkingForUpdate', data: ''});
    });

    this.autoUpdater.on('update-available', (info) => {
        this.updateWin.webContents.send('message', {action: 'updateAvailable', data: ''});
    });

    this.autoUpdater.on('update-not-available', (info) => {
        this.start({});
        this.updateWin.close();
    });

    this.autoUpdater.on('error', (err) => {
        console.log('Error in auto-updater:', err);
    });

    this.autoUpdater.on('download-progress', (progressObj) => {
        this.updateWin.webContents.send('message', {action: 'download', data: progressObj.percent});
    });

    this.autoUpdater.on('update-downloaded', (info) => {
        setTimeout(() => {
            this.autoUpdater.quitAndInstall();
        }, 5000)

    });

    this.updateWin = this._createWindow({
        width: 500,
        height: 100,
        kiosk: true,
        title: this.settings.title + ` - UPDATE`,
        frame: false,
        // webPreferences: {            
        //     nodeIntegration: true,
        //     preload: 'update.preload.js',
        // },
        preload: 'update.preload.js',
        
    });

    // this.updateWin.loadFile(`./update.html?version=${this.settings.version}`);
    this.updateWin.loadFile(`./update.html`);

    if (this.settings.debug) {
        this.updateWin.webContents.openDevTools();
    }

    this.autoUpdater.checkForUpdatesAndNotify();
};
