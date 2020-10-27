const {ipcRenderer, remote} = require('electron');
const path = require('path');


class AppView {
    constructor() {
        this.settings = {};
        this.initEvents();
        this.remote = remote;
        this.win = this.remote.getCurrentWindow();
    }

    async init(event, arg) {

        this.settings = arg.settings;

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
    }

    initEvents() {

        ipcRenderer.on('mainprocess-response', (event, arg) => {
            this[arg.action](event, arg);
        });

        ipcRenderer.send('request-mainprocess-action', {action: 'getSettings'});
    }

    addPageListeners() {
        const selector = document.querySelector('#closeapp')
        if (selector) {

            if (this.settings.showMinimizeButton) {
                selector.style.left = 'unset';
                selector.style.right = '10px';

                selector.addEventListener('click', () => {
                    this.win.setKiosk(!(this.win.isKiosk()));
                });

            } else {
                selector.style.display = 'none';
            }
        }
    }
}


window.addEventListener('load', () => {
    window._APP_ = new AppView();
});

