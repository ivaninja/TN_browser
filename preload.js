const {ipcRenderer, remote} = require('electron');
const path = require('path');


class AppView {
    constructor() {
        this.settings = {};
        this.initEvents();
        this.remote = remote;
        this.win = this.remote.getCurrentWindow();

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
}
.control-container.minimized {
  background-image: url('%_MAXIMIZE_ICON_URL_%');
}`;

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
        const selector = document.querySelector('#closeapp');


        if (selector) {
            selector.remove();
            if (this.settings.showMinimizeButton) {
                const css = document.createElement('link');
                css.setAttribute('rel', 'stylesheet');

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
                document.body.appendChild(control);

                control.addEventListener('click', () => {
                    const value = !(this.win.isKiosk());
                    this.win.setKiosk(value);

                    if(value){
                        control.classList.remove('minimized')
                    } else {
                        control.classList.add('minimized')
                    }

                });

            }
        }
    }
}


window.addEventListener('load', () => {
    window._APP_ = new AppView();
});

