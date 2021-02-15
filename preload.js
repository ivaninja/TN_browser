const {ipcRenderer, remote, webFrame} = require('electron');
const path = require('path');
const url = require('url');


class AppView {
    constructor() {
        this.settings = {};
        this.initEvents();
        this.remote = remote;
        this.win = this.remote.getCurrentWindow();
        this.ipcRenderer = ipcRenderer;
        this.displays = [];
        this.index = this.win.webContents.browserWindowOptions.index;

        this.css = `
.control-container {
  position: fixed;
  margin: %_MARGIN_%;
  %_POSITION_%
  width: 36px;
  height: 36px;
  border: 1px solid #ceced0;
  border-radius: 4px;
  background-image: url('%_MINIMIZE_ICON_URL_%');
  background-position: center;
  background-size: contain;
  cursor: pointer;
  z-index: 99999999999;
}
.control-container.minimized {
  background-image: url('%_MAXIMIZE_ICON_URL_%');
}`;


    }

    async init(event, arg) {


        this.settings = arg.settings;
        this.displays = arg.displays;

        this.win.setTitle(this.settings.title);

        window.print = () => {
            ipcRenderer.send('print', document.body.innerHTML);
        };

        const isDebug = this.settings.debug;

        window._APP_ = this;

        window._logger = new Proxy(console, {
            get: function (target, name) {
                return isDebug === true ? target[name]
                    : () => {
                    };
            }
        });

        _logger.log(`settings`, this.settings);

        const settingsEvent = new CustomEvent('settings', {detail: this.settings});
        window.dispatchEvent(settingsEvent);

        this.addPageListeners();

        // window.addEventListener('online', alertOnlineStatus)
        window.addEventListener('offline', () => {
            this.errorRedirect();
        });
        console.log(`ccccccccccccccccccccccc`);
        // console.log(`this.index `, this.index);
        if (this.index !== null) {

            console.log(`this.index `,this.settings.urls[this.index]);
            webFrame.setZoomFactor(this.settings.urls[this.index].zoom);
        }

    }

    defineSettings(event, arg) {
        this.settings = arg.settings;
        this.win.setTitle(this.settings.title);
        this.win.setKiosk(this.settings.kiosk);
        // this.win.setFrame(this.settings.frame); // it dont work ((

        // remove old
        const cssSel = document.querySelector(`[data-selector="css-style"]`);
        const controlContainerSel = document.querySelector(`[data-selector="control-container"]`);

        const closeapp = document.createElement('div');
        closeapp.setAttribute('id', 'closeapp');
        document.body.appendChild(closeapp);

        if (cssSel) {
            cssSel.remove();
        }

        if (controlContainerSel) {
            controlContainerSel.remove();
        }

        // set new
        this.addPageListeners();

    }

    initEvents() {
        ipcRenderer.on('mainprocess-response', (event, arg) => {
            this[arg.action](event, arg);
        });

        ipcRenderer.send('request-mainprocess-action', {action: 'getSettings'});
    }

    addPageListeners() {
        const selector = document.querySelector('#closeapp');

        if (selector) {
            selector.remove();
            if (this.settings.showMinimizeButton) {
                const css = document.createElement('link');
                css.setAttribute('rel', 'stylesheet');
                css.setAttribute('data-selector', `css-style`);

                const positions = {
                    TOP_LEFT: ['top: 0;', 'left: 0;'].join('\n'),
                    TOP_RIGHT: ['top: 0;', 'right: 0;'].join('\n'),
                    BOTTOM_LEFT: ['bottom: 0;', 'left: 0;'].join('\n'),
                    BOTTOM_RIGHT: ['bottom: 0;', 'right: 0;'].join('\n'),
                };

                this.css = this.css.replace('%_MARGIN_%', this.settings.buttonMargin || '10px');
                this.css = this.css.replace('%_MINIMIZE_ICON_URL_%', this.settings.minimizeIconUrl);
                this.css = this.css.replace('%_MAXIMIZE_ICON_URL_%', this.settings.maximizeIconUrl);
                this.css = this.css.replace('%_POSITION_%', positions[this.settings.buttonPosition] || positions.TOP_RIGHT);


                css.setAttribute('href', `data:text/css;base64,${btoa(this.css)}`);
                document.head.appendChild(css);

                const control = document.createElement('div');
                control.setAttribute('class', 'control-container');
                control.setAttribute('data-selector', 'control-container');
                document.body.appendChild(control);

                control.addEventListener('click', () => {
                    const value = !(this.win.isKiosk());
                    this.win.setKiosk(value);

                    if (value) {
                        control.classList.remove('minimized')
                    } else {
                        control.classList.add('minimized')
                    }

                });
            }
        }

        window.addEventListener('keydown', (e) => {

            if (e.keyCode === 83 && e.altKey && e.ctrlKey) {
                ipcRenderer.send('request-mainprocess-action', {action: 'openSettings'});
            }

            if (e.keyCode === 46 && e.shiftKey && e.ctrlKey) { //CTRL+SHIFT+DELETE
                ipcRenderer.send('request-mainprocess-action', {action: 'flushStore'});
            }

        }, true);
    }
}

window.addEventListener('load', () => {
    window._APP_ = new AppView();
});
