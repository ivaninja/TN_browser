const {app, BrowserWindow, ipcMain, dialog, session, screen} = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs');

const {version} = require('./package.json');
const setDebug = require('./helpers/setDebug');
const checkConnection = require('./helpers/checkConnection');
const randomId = require('./helpers/randomId');

const requestMainProcessAction = require('./processComponents/requestMainProcessAction');
const secondInstance = require('./processComponents/secondInstance');
const onPrint = require('./processComponents/onPrint');
const initUpdates = require('./processComponents/initUpdates');
const workDirectory = require('./processComponents/workDirectory');
const readyToPrint = require('./processComponents/readyToPrint');
const defaultSettings = require('./processComponents/defaultSettings');
const checkOnline = require('./processComponents/checkOnline');

const openSettings = require('./actions/openSettings');
const getSettings = require('./actions/getSettings');
const cancelSettings = require('./actions/cancelSettings');

const defaultOfflineUrl = `http://error.kassesvn.tn-rechenzentrum1.de/`;


class MainProcess {
    constructor() {
        this.app = app;
        this.ipcMain = ipcMain;
        this.screen = screen;
        this.autoUpdater = null;
        this.dialog = dialog;
        this.dirPath = __dirname;
        this.isDev = isDev;
        this.workDirectory = workDirectory(this.isDev);

        this.updateWin = null; // used ./processComponents/initUpdates.js
        this.printWin = null;
        this.win = null;
        this.windows = [];
        this.closedWindowIndexes = [];
        this.isRedirectedToError = false;
        this.isOnline = null;
        this.app.commandLine.appendSwitch('ignore-certificate-errors', 'true');

        this.settings = defaultSettings({version, workDirectory: this.workDirectory, isDev});

        /* - Bind Methods -*/
        this.initUpdates = initUpdates.bind(this);
        this.setDebug = setDebug.bind(this);
        this.checkOnline = checkOnline.bind(this);

        /* - Bind Actions -*/
        this.openSettings = openSettings.bind(this);
        this.getSettings = getSettings.bind(this);
        this.cancelSettings = cancelSettings.bind(this);


        this.setDebug(this.settings.debug);

        this.init();
    }

    async init() {
        const isMain = this.app.requestSingleInstanceLock();

        if (!isMain) {
            console.error(`another instance already running`);
            this.app.quit();
            return;
        }

        this.isOnline = await checkConnection();
        _logger.log(`isOnline: `, this.isOnline);

        await this.initSettings();
        this.initEvents();
        await this.app.whenReady();
        await this.initUpdates();
    }

    async initSettings() {
        _logger.log(`path: `, this.workDirectory);

        const settingsFilePath = path.resolve(`${this.workDirectory}/settings.json`);

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

    initEvents() {
        this.app.on('second-instance', secondInstance.bind(this));
        this.ipcMain.on('request-mainprocess-action', requestMainProcessAction.bind(this));
        this.ipcMain.on('print', onPrint.bind(this));
        this.ipcMain.on('readyToPrint', readyToPrint.bind(this));
    }

    reopenWindows() {
        this.closedWindowIndexes.forEach((itemIndex) => {
            this.openWorkWindow({windowItem: this.settings.urls[itemIndex], index: itemIndex, skipSplash: true});
        });
        this.closedWindowIndexes = [];
    }

    openWorkWindow({windowItem, index, skipSplash}) {
        const sign = randomId();
        const win = this.createWindow({...windowItem, sign, index});
        this.windows.push(win);
        const isSafeishURL = (url) =>  {
            return url.startsWith('http:') || url.startsWith('https:');
        }
        win.webContents.on('will-navigate', (event, url) => {
            event.preventDefault();
            if (isSafeishURL(url)) {
                const win = new BrowserWindow({
                    width: this.settings.width,
                    height: this.settings.height,
                    kiosk: this.settings.kiosk,
                    title: this.settings.title,
                    preload: 'preload.js'
                })
                win.loadURL(url)
            }
            event.newGuest = win
        })
        win.on('close', (event) => {
            const foundIndex = this.windows.findIndex((item) => {
                return item.webContents.browserWindowOptions.preference.sign === sign;
            });

            if (foundIndex !== -1) {
                this.windows.splice(foundIndex, 1);
                this.closedWindowIndexes.push(index);
            } else {
                console.error(`close foundIndex not found`, foundIndex, windowItem)
            }
        });

        win.loadFile('./splash.html');

        win.webContents.once('did-finish-load', ()=>{
            setTimeout(() => {
                win.loadURL(windowItem.url);
            }, skipSplash ? 10 : this.settings.splashScreenTimeout);
        })

        if (this.settings.debug) {
            win.webContents.openDevTools();
        }

        this.removeMenu(win);

        if (!this.isOnline) {
            windowItem.url = windowItem.offlineUrl;
            this.isRedirectedToError = true;
        }

    }

    start({skipSplash = false}) {
        this.settings.urls.forEach((windowItem, index) => {
            this.openWorkWindow({windowItem, index, skipSplash});
        });
        this.checkOnline();
    }

    _createWindow({width, height, kiosk, title, frame, preload, x = 0, y = 0, preference = null}) {
        return new BrowserWindow({
            width,
            height,
            kiosk,
            title,
            frame,
            icon: './assets/favicon.ico',
            preference,
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
        const displays = this.screen.getAllDisplays();
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
            preference: windowItem,
            ...position,
            preload: 'preload.js'
        });


        return win;

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
        fs.writeFileSync(`${this.workDirectory}/settings.json`, JSON.stringify(arg.data, null, '\t'));
        this.settings = {
            ...this.settings,
            ...arg.data
        };

        const oldWindows = [].concat(this.windows);
        this.windows = [];

        oldWindows.forEach((item) => {
            item.hide();
        })

        this.start({skipSplash: true});

        oldWindows.forEach((item) => {
            item.close();
        });

        setTimeout(() => this.openSettings(), 10);

        // console.log(oldWindows)

    }

    async flushStore() {
        for (let i in this.windows) {
            await this.windows[i].webContents.session.clearStorageData();
            this.windows[i].reload();
        }
    }

}

new MainProcess();
