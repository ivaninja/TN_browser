const {app, BrowserWindow, ipcMain, dialog, session, screen} = require('electron');
const {autoUpdater} = require("electron-updater");
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs');
const url = require('url');
const {version} = require('./package.json');
const checkConnection = require('./helpers/checkConnection');


const workDirectory = isDev ?
    path.resolve(`${path.dirname(process.execPath)}/../../../`) : // ../../../node_modules/electron/dist
    path.resolve(`${path.dirname(process.execPath)}`);

const defaultOfflineUrl = `http://error.kassesvn.tn-rechenzentrum1.de/`;

const DEFAULT_SETTINGS = {
    width: 800,
    height: 600,
    kiosk: true,
    title: 'TN-Browser',
    frame: true,
    offlineUrl: '',
    buttonPosition: 'TOP_RIGHT', // TOP_LEFT, TOP_RIGHT, BOTTOM_RIGHT, BOTTOM_LEFT
    buttonMargin: '10px 10px 10px 10px',
    showMinimizeButton: false,
    minimizeIconUrl: 'https://damfastore-magdeburg.kassesvn.tn-rechenzentrum1.de/img/fullscreen_close.png',
    maximizeIconUrl: 'https://damfastore-magdeburg.kassesvn.tn-rechenzentrum1.de/img/fullscreen_open.png',
    debug: isDev,
    splashScreenTimeout: 3000,
    checkOnlineTimeout: 10000,
    devShowPrintWindow: false,
    workDirectory,
    showMenu: false,
    isDev,
    urls: [
        {
            url: 'https://damfastore-magdeburg.kassesvn.tn-rechenzentrum1.de/',
            displayId: 0,
            offlineUrl: 'http://error.kassesvn.tn-rechenzentrum1.de/',
            zoom: 1,
        }
    ],
    version,
};

function setDebug(debug) {
    global._logger = new Proxy(console, {
        get: function (target, name) {
            return debug === true ? target[name]
                : () => {
                };
        }
    });
}

class MainProcess {
    constructor() {
        this.app = app;
        this.ipcMain = ipcMain;
        this.autoUpdater = autoUpdater;
        this.dialog = dialog;

        this.updateWin = null;
        this.printWin = null;
        this.win = null;
        this.winows = [];
        this.isRedirectedToError = false;

        this.isOnline = null;

        this.app.commandLine.appendSwitch('ignore-certificate-errors', 'true');

        this.settings = DEFAULT_SETTINGS;
        setDebug(this.settings.debug);

        this.init();
    }

    async init() {
        this.isOnline = await checkConnection();
        _logger.log(`isOnline: `, this.isOnline);

        await this.initSettings();
        this.initEvents();
        await this.app.whenReady();
        await this.initUpdates();
    }

    async initSettings() {
        _logger.log(`path: `, workDirectory);

        const settingsFilePath = path.resolve(`${workDirectory}/settings.json`);

        if (fs.existsSync(settingsFilePath)) {
            const settingsFile = fs.readFileSync(settingsFilePath, 'utf8');
            try {

                const settings = JSON.parse(settingsFile);

                this.settings = {
                    ...this.settings,
                    ...settings,
                    isOnline: this.isOnline,
                };

                this.settingsMigration();

            } catch (e) {
                console.error(`Something went wrong! settings.json is not JSON`);
            }

        }

        setDebug(this.settings.debug);

        return;
    }

    settingsMigration() {
        this.settings.urls = this.settings.urls.map((item) => {
            if (!item.hasOwnProperty('offlineUrl')) {
                item.offlineUrl = defaultOfflineUrl;
            }

            if (!item.hasOwnProperty('zoom')) {
                item.zoom = 1;
            }
            return item;
        });
    }

    initUpdates() {

        if (isDev || !this.isOnline) {
            this.start({});
            return
        }

        this.autoUpdater.on('checking-for-update', () => {
            console.log(`checking-for-update`)

            this.updateWin.webContents.send('message', {action: 'checkingForUpdate', data: ''});
        });

        this.autoUpdater.on('update-available', (info) => {
            // console.log(info)
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
            kiosk: false,
            title: this.settings.title + ` - UPDATE`,
            frame: false,
            preload: 'update.preload.js'
        });

        this.updateWin.loadFile('./update.html');

        if (this.settings.debug) {
            this.updateWin.webContents.openDevTools();
        }

        this.autoUpdater.checkForUpdatesAndNotify();
    }

    initEvents() {

        this.ipcMain.on('request-mainprocess-action', (event, arg) => {
            _logger.log('action:', arg.action)
            this[arg.action](event, arg);
        });

        this.ipcMain.on('print', (event, content) => {

            this.printWin = new BrowserWindow({
                show: this.settings.devShowPrintWindow,
                webPreferences: {
                    nativeWindowOpen: true,
                    webSecurity: false,
                    allowRunningInsecureContent: true,
                    enableRemoteModule: true,
                    nodeIntegration: true,
                    preload: path.join(__dirname, 'preload2.js'),
                },
            });

            this.printWin.loadURL('file://' + __dirname + '/receipt.html');

            this.printWin.webContents.on('did-finish-load', () => {
                this.printWin.webContents.send('setContent', content);
            });
        });

        this.ipcMain.on('readyToPrint', (event) => {
            this.printWin.webContents.print({silent: true,  margins: { marginType : 'none'}});
        });

        this.app.on('second-instance', (event, commandLine, workingDirectory) => {
            // Someone tried to run a second instance, we should focus our window.
            console.log(`second instance event:`, event );
            console.log(`second instance commandLine:`, commandLine );
            console.log(`second instance workingDirectory:`, workingDirectory );
        });

    }

    async checkOnline() {
        this.isOnline = await checkConnection();

        if (!this.isOnline && !this.isRedirectedToError) {
            this.winows.forEach((win, index) => {
                win.loadURL(this.settings.urls[index].offlineUrl);
            });

            this.isRedirectedToError = true;
        }

        if (this.isOnline && this.isRedirectedToError) {
            this.winows.forEach((win, index) => {
                win.loadURL(this.settings.urls[index].url);
            });
            this.isRedirectedToError = false;
        }

        setTimeout(() => {
            this.checkOnline();
        }, this.settings.checkOnlineTimeout);

    }

    start({skipSplash = false}) {

        this.settings.urls.forEach((windowItem, index) => {

            const win = this.createWindow({...windowItem, index})
            this.winows.push(win);

            win.loadFile('./splash.html');


            if (this.settings.debug) {
                win.webContents.openDevTools();
            }

            this.removeMenu(win);

            if (!this.isOnline) {
                windowItem.url = windowItem.offlineUrl;
                this.isRedirectedToError = true;
            }

            setTimeout(() => {
                win.loadURL(windowItem.url);
            }, skipSplash ? 10 : this.settings.splashScreenTimeout);

        });

        this.checkOnline();
    }

    _createWindow({width, height, kiosk, title, frame, preload, x = 0, y = 0, zoomFactor = 1, index = null}) {
        return new BrowserWindow({
            width,
            height,
            kiosk,
            title,
            frame,
            icon: './assets/favicon.ico',
            index,
            webPreferences: {
                nativeWindowOpen: true,
                webSecurity: false,
                allowRunningInsecureContent: true,
                enableRemoteModule: true,
                preload: path.join(__dirname, preload), // use a preload script
            },
            x,
            y
        });
    }

    createWindow(windowItem) {
        const displays = screen.getAllDisplays();
        let externalDisplay = displays.find((display) => {
            return display.id === windowItem.displayId;
        });

        let position = {
            x: 0,
            y: 0
        }

        if (externalDisplay) {
            position.x = externalDisplay.bounds.x + 50;
            position.y = externalDisplay.bounds.y + 50;
        }

        const win = this._createWindow({
            width: this.settings.width,
            height: this.settings.height,
            kiosk: this.settings.kiosk,
            title: this.settings.title,
            frame: this.settings.frame,
            index: windowItem.index,
            ...position,
            preload: 'preload.js'
        });


        return win;

        // console.log(`screen`, screen.getAllDisplays())
    }

    getSettings(event, arg) {
        event.sender.send('mainprocess-response', {
            action: 'init',
            settings: this.settings,
            displays: screen.getAllDisplays(),
        });
    }

    openSettings() {
        this.winows[0].loadFile('./settings.html');
    }

    cancelSettings() {
        this.winows[0].loadURL(this.settings.urls[0].url);
    }

    removeMenu(win) {
        if (!this.settings.showMenu) {
            if (typeof win.removeMenu === 'function') {
                win.removeMenu();
            } else {
                win.setMenu(null);
            }
        }
    }

    saveSettings(event, arg) {
        // event, arg
        fs.writeFileSync(`${workDirectory}/settings.json`, JSON.stringify(arg.data, null, '\t'));
        this.settings = {
            ...this.settings,
            ...arg.data
        };

        const oldWindows = [].concat(this.winows);
        this.winows = [];

        oldWindows.forEach((item) => {
            item.hide();
        })

        this.start({skipSplash: true});

        oldWindows.forEach((item) => {
            item.close();
        });

        setTimeout(()=> this.openSettings(), 10);

        // console.log(oldWindows)


    }

    async flushStore() {
        await this.winows[0].webContents.session.clearStorageData();
        this.winows[0].reload();
    }

}

new MainProcess();
