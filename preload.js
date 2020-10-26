const {ipcRenderer} = require('electron');
const path = require('path');


class AppView {
    constructor() {
        this.settings = {};
        this.initEvents();
    }

    async init(event, arg) {

        this.settings = arg.settings;

        window.print = () => {
            ipcRenderer.send('print', document.body.innerHTML);
        };

        const isDebug = this.settings.debug;

        window._logger = new Proxy(console, {
            get: function (target, name) {
                return isDebug === true ? target[name]
                    : () => {
                    };
            }
        });

        _logger.log(`settings`, this.settings);

        const settingsEvent = new CustomEvent('settings', { detail: this.settings });
        window.dispatchEvent(settingsEvent);
    }

    initEvents() {

        ipcRenderer.on('mainprocess-response', (event, arg) => {
            this[arg.action](event, arg);
        });

        ipcRenderer.send('request-mainprocess-action', {action: 'getSettings'});
    }
}


window.addEventListener('load', () => {
    window._APP_ = new AppView();
});

