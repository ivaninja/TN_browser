const {
    app,
    BrowserWindow,
    ipcMain,
    dialog,
    session,
    screen,
    contentTracing,
    Notification,
    Menu
} = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs');
const Url = require('url');
const axios = require("axios");
const { version } = require('./package.json');
const setDebug = require('./helpers/setDebug');
const checkConnection = require('./helpers/checkConnection');
const randomId = require('./helpers/randomId');

const requestMainProcessAction = require('./processComponents/requestMainProcessAction');
const secondInstance = require('./processComponents/secondInstance');
const onPrint = require('./processComponents/onPrint');
const onPrintPDF = require('./processComponents/onPrintPDF');
const initUpdates = require('./processComponents/initUpdates');
const workDirectory = require('./processComponents/workDirectory');
const readyToPrint = require('./processComponents/readyToPrint');
const readyToPrintOther = require('./processComponents/readyToPrintOther');
const defaultSettings = require('./processComponents/defaultSettings');
const checkOnline = require('./processComponents/checkOnline');

const openSettings = require('./actions/openSettings');
const getSettings = require('./actions/getSettings');
const cancelSettings = require('./actions/cancelSettings');

const defaultOfflineUrl = `http://error.kassesvn.tn-rechenzentrum1.de/`;

app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
app.commandLine.appendSwitch('disable-gpu', 'true');
app.commandLine.appendSwitch('touch', 'true');
app.commandLine.appendSwitch('touch-events', 'true');
app.commandLine.appendSwitch('enable-touch-events', 'true');
app.disableHardwareAcceleration();
Menu.setApplicationMenu(false);

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
        this.app.setAppUserModelId('TN Browser');
        this.updateWin = null; // used ./processComponents/initUpdates.js
        this.printWin = null;
        this.winG = null;
        this.win = null;
        this.windows = [];
        this.printers = [];
        this.closedWindowIndexes = [];
        this.isRedirectedToError = false;
        this.isOnline = null;
        
        this.settings = defaultSettings({
            version,
            workDirectory: this.workDirectory,
            isDev,
        });

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

        this.isOnline = await checkConnection(this.settings.checkOnlineUrl);
        _logger.log(`isOnline: `, this.isOnline);

        await this.initSettings();
        this.initEvents();
        // await this.app.whenReady().then(() => {
        //     (async () => {
        //       await contentTracing.startRecording({
        //         included_categories: ['*']
        //       })
        //       console.log('Tracing started')
        //       await new Promise(resolve => setTimeout(resolve, 5000))
        //       const path = await contentTracing.stopRecording()
        //       console.log('Tracing data recorded to ' + path)
        //     })()
        //   });
        await this.initUpdates();
    }

    async initSettings() {
        _logger.log(`path: `, this.workDirectory);
        const settingsFilePath = path.resolve(
            `${this.workDirectory}/settings.json`
        );

        if (fs.existsSync(settingsFilePath)) {
            const settingsFile = fs.readFileSync(settingsFilePath, 'utf8');
            try {
                const settings = JSON.parse(settingsFile);

                this.settings = {
                    ...this.settings,
                    ...settings,
                    isOnline: this.isOnline,
                };
                
                if(this.settings.VRKiosk == true)
                {
                    axios.get("http://localhost:1880/tnbrowserurl").then((res) => {
                        if((typeof res.data != "undefined")&&(typeof res.data.location != "undefined"))
                        {
                            var expiration = new Date();
                            var hour = expiration.getHours() + 24;
                            expiration.setHours(hour);
                            this.settings.urls[0].url = res.data.location;
                            const cookie_arr = [
                                { url: res.data.location, name: 'kasse_id', value: res.data.kasse_id.toString(), 'path':'/', expirationDate: expiration.getTime()},
                                { url: res.data.location, name: 'kasse_user_id', value: res.data.kasse_user_id.toString(), 'path':'/', expirationDate: expiration.getTime()},
                                { url: res.data.location, name: 'terminal_id', value: res.data.terminal_id.toString(), 'path':'/', expirationDate: expiration.getTime()},
                                { url: res.data.location, name: 'partner_id', value: res.data.partner_id.toString(), 'path':'/', expirationDate: expiration.getTime()},
                                { url: res.data.location, name: 'kunde_id', value: res.data.kunde_id.toString(), 'path':'/', expirationDate: expiration.getTime()},
                                { url: res.data.location, name: 'filial_id', value: res.data.filial_id.toString(), 'path':'/', expirationDate: expiration.getTime()}
                            ];
                            session.defaultSession.clearStorageData();
                            cookie_arr.forEach((cookie)=>{
                                session.defaultSession.cookies.set(cookie)
                                .then(() => {
                                    // success
                                }, (error) => {
                                    console.error(error)
                                })
                            });                            
                        }                                                
                    }).catch(error => console.log(error));
                }
                
                this.settingsMigration();
            } catch (e) {
                console.error(
                    `Something went wrong! settings.json is not JSON`
                );
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
    

    showNotification (title, body) {
        new Notification({ title: title, body: body }).show()
    }

    initEvents() {
        this.app.on('second-instance', secondInstance.bind(this));
        this.app.on('window-all-closed', () => {
            this.app.quit();
        });

        this.ipcMain.on(
            'request-mainprocess-action',
            requestMainProcessAction.bind(this)
        ); 
        this.ipcMain.on('print', onPrint.bind(this));
        this.ipcMain.on('printPdf', onPrintPDF.bind(this));
        this.ipcMain.on('readyToPrint', readyToPrint.bind(this));
        this.ipcMain.on('readyToPrintOther', readyToPrintOther.bind(this));
        this.ipcMain.on('show-context-menu', (event) => {
            return false;
        });
    }

    reopenWindows() {
        this.closedWindowIndexes.forEach((itemIndex) => {
            this.openWorkWindow({
                windowItem: this.settings.urls[itemIndex],
                index: itemIndex,
                skipSplash: true,
            });
        });
        this.checkOnline();
        this.closedWindowIndexes = [];
    }

    openWorkWindow({ windowItem, index, skipSplash }) {
        const sign = randomId();
        const isPrimary = index === 0;
        var win = this.createWindow({ ...windowItem, sign, index }, isPrimary);
        this.windows.push(win);
        win.on('close', (event) => {
            const foundIndex = this.windows.findIndex((item) => {
                return (
                    item.webContents.browserWindowOptions.preference.sign ===
                    sign
                );
            });

            if (foundIndex !== -1) {
                this.windows.splice(foundIndex, 1);
                this.closedWindowIndexes.push(index);
                win = null;
            } else {
                console.error(
                    `close foundIndex not found`,
                    foundIndex,
                    windowItem
                );
            }
        });
        win.on('closed', (event) => {
            win = null;
        });
        win.webContents.on('will-navigate', (event, url) => {
            var testUrl = Url.parse(url);
            let allowedUrls = [];
            this.settings.urls.forEach(element => {
                let testUrl1 = Url.parse(element.url);
                let testUrl2 = Url.parse(element.offlineUrl);
                allowedUrls.push(testUrl1.host, testUrl2.host);
            });
            this.settings.whitelist.forEach(element => {
                let testUrl1 = Url.parse(element);                
                allowedUrls.push(testUrl1.host);
            });
            if(!allowedUrls.includes(testUrl.host))
            {
                this.showNotification('Error', 'Forbidden link');
                event.preventDefault();
            }
            /*
            console.log(win.webContents.findInPage('iframe'));
            console.log(win.webContents.executeJavaScript(`function gethtml () {
                return new Promise((resolve, reject) => { resolve(document.getElementsByTagName("iframe")); });
                }
                gethtml();`).then((html) => {
            // var title = html.match(/<iframe[^>]*>([^<]+)<\/iframe>/);
            console.log(html);
                // sending the HTML to the function extractLinks
                // extractLinks(html)
              }));  
            */

        });
        if(this.settings.VRKiosk == true)
        {
        win.webContents.on('new-window', (event, url, frameName, disposition, options, additionalFeatures, referrer, postBody) => {
            event.preventDefault();
            this.winG = null;
            this.winG = new BrowserWindow({
              webContents: options.webContents, // use existing webContents if provided
              width: this.settings.guestwidth, 
              height: this.settings.guestheight,
              icon: './assets/favicon_new.ico',
              show: false,
              webPreferences: {
                nativeWindowOpen: true,
                webSecurity: false,
                allowRunningInsecureContent: true,
                enableRemoteModule: true,
                preload: path.join(__dirname, 'preload.js'), // use a preload script
            },
            })
            this.winG.setKiosk(false);
            this.winG.removeMenu();
            this.winG.once('ready-to-show', () => this.winG.show());
            this.winG.on('closed', (event) => {
                this.winG = null;
            });
            if (!options.webContents) {
              const loadOptions = {
                httpReferrer: referrer
              }
              if (postBody != null) {
                const { data, contentType, boundary } = postBody
                loadOptions.postData = postBody.data
                loadOptions.extraHeaders = `content-type: ${contentType}; boundary=${boundary}`
              }
          
              this.winG.loadURL(url, loadOptions) // existing webContents will be navigated automatically
            }
            event.newGuest = this.winG
          });
        }

        //   win.webContents.on(
        //     'did-frame-navigate',
        //     (event, url, httpResponseCode, httpStatusText, isMainFrame, frameProcessId, frameRoutingId) => {
        //         console.log(url);
        //         console.log("isMainFrame->"+isMainFrame);
        //         const frame = webFrameMain.fromId(frameProcessId, frameRoutingId)

        //     }
        //   )
        /*win.webContents.on('frame-created', (event, details)=>{
            console.log('iframe');
            
        });*/
        /*win.webContents.on('dom-ready', () => {
  
            // we can get its URL and display it in the console
            let currentURL = win.getURL()
            console.log('currentURL is : ' + currentURL)
          
            // same thing about the title of the page
            let titlePage = win.getTitle()  
            console.log('titlePage is : ' + titlePage)
          
            // executing Javascript into the webview to get the full HTML
            win.webContents.executeJavaScript(`function gethtml () {
              return new Promise((resolve, reject) => { resolve(document.documentElement.innerHTML); });
              }
              gethtml();`).then((html) => {
        //   console.log(html);
              // sending the HTML to the function extractLinks
            //   extractLinks(html)
            })  
          })*/

        // win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        //     console.log(details.responseHeaders);
        //     console.log('seek iframe');
        //     callback({ responseHeaders: Object.fromEntries(Object.entries(details.responseHeaders).filter(header => !/x-frame-options/i.test(header[0]))) });
        // });

        win.loadFile('./splash.html');

        win.webContents.once('did-finish-load', () => {
            setTimeout(
                () => {
                    this.isOnline ? win.loadURL(windowItem.url):win.loadURL(windowItem.offlineUrl);
                },
                skipSplash ? 10 : this.settings.splashScreenTimeout
            );
        });

        if (this.settings.debug) {
            win.webContents.openDevTools();
        }

        this.removeMenu(win);

        if (!this.isOnline) {
            // windowItem.url = windowItem.offlineUrl;
            this.isRedirectedToError = true;
        }      

    }

    start({ skipSplash = false }) {
        this.settings.urls.forEach((windowItem, index) => {
            this.openWorkWindow({ windowItem, index, skipSplash });
        });
        this.checkOnline();
        setTimeout(() => this.clearCache(), 10);
    }

    _createWindow({
        width,
        height,
        kiosk,
        title,
        frame,
        preload,
        x = 0,
        y = 0,
        preference = null,
    }) {
        return new BrowserWindow({
            width,
            height,
            kiosk,
            title,
            frame,
            icon: './assets/favicon_new.ico',
            preference,
            webPreferences: {
                nativeWindowOpen: true,
                webSecurity: false,
                allowRunningInsecureContent: true,
                enableRemoteModule: true,
                preload: path.join(__dirname, preload), // use a preload script
            },
            x,
            y,
        });
    }

    createWindow(windowItem, isPrimary) {
        const displays = this.screen.getAllDisplays();
        let externalDisplay = displays.find((display) => {
            return display.id === windowItem.displayId;
        });

        let position = {
            x: 0,
            y: 0,
        };

        if (externalDisplay) {
            position.x = externalDisplay.bounds.x + 50;
            position.y = externalDisplay.bounds.y + 50;
        }

        const win = this._createWindow({
            width: this.settings.width,
            height: this.settings.height,
            kiosk: isPrimary ? this.settings.kiosk : true,
            title: this.settings.title,
            frame: this.settings.frame,
            preference: windowItem,
            ...position,
            preload: 'preload.js'
        });

        this.printers = win.webContents.getPrinters();
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
        fs.writeFileSync(
            `${this.workDirectory}/settings.json`,
            JSON.stringify(arg.data, null, '\t')
        );
        this.settings = {
            ...this.settings,
            ...arg.data,
        };
        
        const oldWindows = [].concat(this.windows);
        // this.windows = [];
        this.clearCache();
        oldWindows.forEach((item, index) => {
            item.hide();
        });

        this.start({ skipSplash: true });

        oldWindows.forEach((item) => {
            item.close();
        });

        //setTimeout(() => this.openSettings(), 10);

        // console.log(oldWindows)
    }

    async flushStore() {
        for (let i in this.windows) {
            await this.windows[i].webContents.session.clearStorageData();
            this.windows[i].reload();
        }
    }

    async clearCache(reload = true) {
        console.log('clean cache');
        for (let i in this.windows) {
            await this.windows[i].webContents.session.clearCache();
            // if (reload) this.windows[i].reload();
        }
    }

    // async sendCoords(event, arg) {
    //     try
    //     {
    //         const response = await fetch('http://localhost:7000/coordinates', {method: 'POST', body: arg.data});            
    //     }
    //     catch(e){
    //         console.log(e);
    //     }        
    // }

    goToOffline() {
        let options = {
            buttons: ['Ja', 'Nein'],
            message: 'Möchten Sie in die Offline-Version wechseln?',
        };
        dialog.showMessageBox(options).then((response) => {
            if (response.response == 0) {
                for (let i in this.windows) {
                    this.windows[i].loadURL(
                        this.windows[i].webContents.browserWindowOptions
                            .preference.offlineUrl
                    );
                }
            }
        });
        // console.log(response);
    }

    async openDevTools() {
        for (let i in this.windows) {
            await this.windows[i].webContents.openDevTools();
        }
    }
}

new MainProcess();
