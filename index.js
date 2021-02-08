const {app, BrowserWindow, ipcMain, dialog, session, screen} = require('electron');
const {autoUpdater} = require("electron-updater");
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs');
const {version} = require('./package.json');


const workDirectory = isDev ?
    path.resolve(`${path.dirname(process.execPath)}/../../../`) : // ../../../node_modules/electron/dist
    path.resolve(`${path.dirname(process.execPath)}`);


const DEFAULT_SETTINGS = {
    width: 800,
    height: 600,
    kiosk: true,
    title: 'TN-Browser',
    frame: true,
    buttonPosition: 'TOP_RIGHT', // TOP_LEFT, TOP_RIGHT, BOTTOM_RIGHT, BOTTOM_LEFT
    buttonMargin: '10px 10px 10px 10px',
    showMinimizeButton: false,
    minimizeIconUrl: 'https://damfastore-magdeburg.kassesvn.tn-rechenzentrum1.de/img/fullscreen_close.png',
    maximizeIconUrl: 'https://damfastore-magdeburg.kassesvn.tn-rechenzentrum1.de/img/fullscreen_open.png',
    debug: isDev,
    splashScreenTimeout: 3000,
    workDirectory,
    showMenu: false,
    isDev,
    urls: [
        {
            url: 'https://damfastore-magdeburg.kassesvn.tn-rechenzentrum1.de/',
            displayId: 0,
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

        this.app.commandLine.appendSwitch('ignore-certificate-errors', 'true');

        this.settings = DEFAULT_SETTINGS;
        setDebug(this.settings.debug);

        this.init();
    }

    async init() {
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
                };

            } catch (e) {
                console.error(`Something went wrong! settings.json is not JSON`);
            }

        }

        setDebug(this.settings.debug)

        return;
    }

    initUpdates() {

        if (isDev) {
            this.start();
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
            this.start();
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

            this.printWin.loadURL('file://' + __dirname + '/receipt.html');

            this.printWin.webContents.on('did-finish-load', () => {
                this.printWin.webContents.send('setContent', content);
            });
        });

        this.ipcMain.on('readyToPrint', (event) => {
            this.printWin.webContents.print({silent: true});
        });

    }

    start() {

        this.settings.urls.forEach((windowItem) => {

            const win = this.createWindow(windowItem)
            this.winows.push(win);


            win.loadFile('./splash.html');

            if (this.settings.debug) {
                win.webContents.openDevTools();
            }

            this.removeMenu(win);

            setTimeout(() => {
                    win.loadURL(windowItem.url);
                },
                this.settings.splashScreenTimeout)
            ;

        });

    }

    _createWindow({width, height, kiosk, title, frame, preload, x = 0, y = 0}) {
        return new BrowserWindow({
            width,
            height,
            kiosk,
            title,
            frame,
            icon: './assets/favicon.ico',
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
        console.log(`externalDisplay`, externalDisplay);

        return this._createWindow({
            width: this.settings.width,
            height: this.settings.height,
            kiosk: this.settings.kiosk,
            title: this.settings.title,
            frame: this.settings.frame,
            ...position,
            preload: 'preload.js'
        });

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

        const oldWin = this.winows[0];

        this.winows[0] = this.createWindow(this.settings.urls[0]);

        this.openSettings();

        if (this.settings.debug) {
            this.winows[0].webContents.openDevTools();
        }

        this.removeMenu(this.winows[0]);

        oldWin.close();
    }

    async flushStore() {
        await this.winows[0].webContents.session.clearStorageData();
        this.winows[0].reload();
    }

}

new MainProcess();
