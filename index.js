const {app, BrowserWindow, ipcMain, dialog} = require('electron');
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
    defaultUrl: 'https://damfastore-magdeburg.kassesvn.tn-rechenzentrum1.de/',
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

        this.updateWin = this._createWindow({
            width: 500,
            height: 100,
            kiosk: false,
            title: this.settings.title + ` - UPDATE`,
            frame: false,
            preload: 'update.preload.js'
        });

        this.updateWin.loadFile('./update.html');
        this.updateWin.webContents.openDevTools();


        this.autoUpdater.on('checking-for-update', () => {
            console.log(`checking-for-update`)
            this.updateWin = this._createWindow({
                width: 500,
                height: 100,
                kiosk: false,
                title: this.settings.title + ` - UPDATE`,
                frame: false,
                preload: 'update.preload.js'
            });

            this.updateWin.loadFile('./update.html');
        });

        this.autoUpdater.on('update-available', (info) => {
            this.updateWin.webContents.send('message', {action: 'updateAvailable', data: ''});
            console.log(info)
        });

        this.autoUpdater.on('update-not-available', (info) => {
            this.start();
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

    start(oldWin = null) {

        this.createWindow();

        this.win.loadFile('./splash.html');

        if (oldWin) {
            oldWin.close();
        }

        if (this.settings.debug) {
            this.win.webContents.openDevTools();
        }

        if (!this.settings.showMenu) {
            this.win.removeMenu();
        }

        setTimeout(() => {
            this.win.loadURL(this.settings.defaultUrl);
        }, this.settings.splashScreenTimeout);
    }

    _createWindow({width, height, kiosk, title, frame, preload}) {
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
        });
    }

    createWindow() {
        this.win = this._createWindow({
            width: this.settings.width,
            height: this.settings.height,
            kiosk: this.settings.kiosk,
            title: this.settings.title,
            frame: this.settings.frame,
            preload: 'preload.js'
        });
    }

    getSettings(event, arg) {
        event.sender.send('mainprocess-response', {action: 'init', settings: this.settings});
    }

    openSettings() {
        this.win.loadFile('./settings.html');
    }

    cancelSettings() {
        this.win.loadURL(this.settings.defaultUrl);
    }


    saveSettings(event, arg) {
        // event, arg
        fs.writeFileSync(`${workDirectory}/settings.json`, JSON.stringify(arg.data, null, '\t'));
        this.settings = {
            ...this.settings,
            ...arg.data
        };

        const oldWin = this.win;

        this.createWindow();
        this.openSettings();

        if (this.settings.debug) {
            this.win.webContents.openDevTools();
        }

        if (!this.settings.showMenu) {
            this.win.removeMenu();
        }

        oldWin.close();
    }

}

new MainProcess();
