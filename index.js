const {app, BrowserWindow, ipcMain, autoUpdater, dialog} = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs');
const {version} = require('./package.json');


const workDirectory = isDev ?
    path.resolve(`${path.dirname(process.execPath)}/../../../`) : // ../../../node_modules/electron/dist
    path.resolve(`${path.dirname(process.execPath)}`)


const DEFAULT_SETTINGS = {
    width: 800,
    height: 600,
    kiosk: true,
    title: 'TN-Browser',
    frame: false,
    buttonPosition: 'TopRight', // TopLeft, TopRight, BottomRight, BottomLeft
    buttonMargin: '10px',
    showMinimizeButton: false,
    debug: isDev,
    splashScreenTimeout: 3000,
    workDirectory,
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
        this.createWindow();
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

    createWindow() {
        this.win = new BrowserWindow({
            width: this.settings.width,
            height: this.settings.height,
            kiosk: this.settings.kiosk,
            title: this.settings.title,
            frame: this.settings.frame,
            icon: './assets/favicon.ico',
            webPreferences: {
                nativeWindowOpen: true,
                webSecurity: false,
                allowRunningInsecureContent: true,
                enableRemoteModule: true,
                preload: path.join(__dirname, 'preload.js'), // use a preload script
            },
        });

        this.win.loadFile('./splash.html');

        if(this.settings.debug){
            this.win.webContents.openDevTools();
        } else {
            this.win.removeMenu();
        }
        this.win.removeMenu();

        setTimeout(() => {
            this.win.loadURL(this.settings.defaultUrl);
        }, this.settings.splashScreenTimeout);
    }

    getSettings(event, arg) {
        event.sender.send('mainprocess-response', {action: 'init', settings: this.settings});
    }
}

new MainProcess();
