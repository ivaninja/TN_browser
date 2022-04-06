const { ipcRenderer, remote, webFrame } = require('electron');
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
        this.preference = this.win.webContents.browserWindowOptions.preference;

        this.css = `
.control-container {
  position: fixed;
  margin: %_MARGIN_%;
  %_POSITION_%
  width: 36px;
  height: 36px;
  border: 1px solid #ceced0;
  border-radius: 4px;
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAYAAAA6RwvCAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4AYHBCQ28Vyg2AAAAiVJREFUWMPtlrFuE0EQhv/ZPEBSg9N6zxVSTMczeH3uUAoQkCNCiALRIApyJJA3QODYch7B9p7Tp0uVgLvbK5GQoaIBIYQ0S3EcCeZsr22aSPd3s7d7+83M7s4AhQpdEq1M+qBUIyiXK/eTJD5adpMwDMXq6lpHysqaMfHQGUSpRgDYJhGuSymvGGMGy0CcnQ0PAdxmZiVl5UOSxO/H54m8xdaiCoBSi4JarXFwbi8CYW8BgBBCAHQjb24uSBR1HwC2ldlEdkspv5XBKOXvTU6pv58HkTpIh9Xqte28ddO8JKXqTYCCbIAZHSHwhZkfDwZ6Qlp9S0T71qKUA7EVhiE7RyRbq3V/+2JkhMBdAE8A2GkpsdY+mwdiFkguTBYc13PiAuECgtR7+vbvmKv48ywIJ5Barf6SmR8x808AP5j5O5H96opBRE/r9car4skuVOh/a2YhU8oPAeyMj2vdo0lPfM4V3un3u7tLvSNa90Jr7e4Szj6fBeEEEoahAMT64hx23SXyYhbE6emwTWTvLJH9IK3i02HEfBD8BsALl3T8XShnN1cr7hD2rdb6oTHxsZQeGRMf5631vIrVurdnjBmUy5WrRNhIDyw2pPRKxsSR861Rym8DuHehlDfTrm2eqps1V35r7F/tKOoGrj3ryfmmfLAgxO9+phcwo5PZRDhxTk2SxO88T360VoyiqL8oxB9tbt4cjEafSgC91rrbKZ7vQpdavwAxagPaHa87EAAAAABJRU5ErkJggg==');
  background-position: center;
  background-size: contain;
  cursor: pointer;
  z-index: 99999999999;
}
.control-container.minimized {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAYAAAA6RwvCAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4AYHBCQbtIP8rQAAAeFJREFUWMPtlrFOIzEQhv/x9YjiKiBtvGmB11gndIjuDuVOwCMgJc7dM5wgJOIVkvWGno4K0HXr9CgoD7FDESBhs7vykjRI+3frHXs+2WP/A5Qq9UVEaYNKNXgpkKgdBIM/RRZXqqEBtJPjxgyX8grHNVtFIV4TamZ2mucIwpWs3cuT1loAorJGEGoqVe8WgdFai/v7/30i/rEqSAvg3iKM7x9cucCkQ8QXADpZc76lDXpejY0Z/rXWjqrV2jYRdmcFi10pvR1ro7AYBF8aY86sjW6l9Mja6Nbp1iRjlGr0ABy/L8vUD8NBM+Om9BOx3TAcnADgVWuEjRk24xjXb99EuMsMZtzNk8ZXLhCZR5Omo6PD0WTyvAPQP2MG11lx43H06HnyiVlMwjBwgihVqtRn5Hx9tdZiY2OzJ2Xtu7XRY779HzSr1dqv8Ti6WSvI/NnGTwDK8+STtfYhCwLgLhH2pZRb1trRWtw3xTsojsV+zsu6N7cOd9cWOZ1VqoEteEeqZv8+uvYijO/XO4VaxVlnJSrLLhqcOjzbNEtOC8bIPWZMiei8UKtIRK1kP+EI8WqUwe/kzhDR+YodWnxhjDkraGApMCu3imL6SRdlZkzXCIL2WwEXke/XO3nHUarUl9QLEqXq+yZwhCIAAAAASUVORK5CYII=');
}

.offline_icon {
    position: fixed;
  margin: 10px;
  top:0px;
  right:46px;
  width: 36px;
  height: 36px;
  border: 1px solid #ceced0;
  border-radius: 4px;
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAABEdJREFUWEfFl1tsFFUYx//fbEttovZBGm1UIk9iotiydqc1CjPbFxutu7OID0LwFhE1XpDYB2OUaHggoni/omCUkrC6M0ujEg07sxpkZ2qpJlA0vvhg0YDVRKMp0D2fmZldspfZ0sVe9unsmXPm+53/+X/fOUOY5x/Nc3yUAXQvX9nhAh386pORuQI7A9CpxNslxrAbmAnrHMt4by4gqgEkkiBYzBVE2RbIqnYPBL8LF8IVgvihXMZ4czaVqDJhRInfS4x3PIj/qYSsJG5jxgaEsNXJpPSghQRmwUxBdK6ID0sSLWOICQlQcmbaroSomYYzARGJauuJ4W2hEDjW2ISOb77Qj5dCTFkHZsITsqq9BeB+L7vArzqm8ciUALKSuGxRa+jXZDKZdwfWo0RXNNYnGHsAWP8sXBA7kkye6u3tbfpjovkowIsh+BQRrsxZxs9FiDIFImq8n0BbWPBnTta4uThouhARVXuBgMfdecT0Ws5KPewtQtXWEvCB/z5+zjaNpwMBZDV2FJCWAPyLbRqXl0o1HYju6KpLBZ8eAqiNmfMU4qX2/vRoOLyuseGC4ydA1MLEI07GWFYFIPfcejFE6DePXvBALmusrnRsJQRCNCCAcRbY/q2lH/ZWG01oxJzyF8sv2ZaxwW12qdoeBlZ5vRJanf36uBerGKQ7GrtesHTA+094ws7oW4PytgyiMMBNM8FSZwGCZDU+5qoAxhHb0q/2tyHxJIE3exnB3DFkGd+VAUSUeJyIvGLBoNWOmRpw2+EbE22hBqj5808bw4OD/1YZswAhCC8PZfTH/GCxzwnSTQz87Zj6hW6fHNXuBuN9ty0xeg9a+r4yANfBzNJe30BYk7P0Xb6k8UPE1MGE7U5Gv6+oSrUS/KFtGmtLASDwl53VW6YFICvaDSB87SuAfsfUn/cBtFFiXMWMMUe5dhE2bRKBEMWyrbTvkLMjY4B0CYEP50zjmsotYKDdMfXvyxQIK30LG6jhhA8gdjlmeo1HrsZfB+jBQtC4berpUm9UZYfEuwmSZ2ACtuVM3UvLs5rQD1ZMQ/zezH+2WZY1KfesXIrJ/Ih7OLkqNDbmIwe+3HusJkTRmDXSEMCwberXFeeXFaIuNbGFwf2eCsR3OBljd0G+Nwj8QGF7XnRMfWMpQLAxxae2mb7Ff6bdSYSdhTnP2qb+TCBAZHnfYkihn4goBMaPzWhpt6ydE345bUozeIVEuD2XSQ9WAlRBFDxxUfPJj8YnzvuBgCuYcVICL6lZin23JnaA+S4/gHjFNtOPBgWr1VdVrIhsELp99aZxGLlmDFFolECt3iSm9Y6VevucIQoT6zqO5Z6EikmxDxItEIIPDWWNcD0AQZ5gwmYnoz9V+Z6a94EuVUsIQRuJsM22Uh/XC1DLE5W37Vn/MDnbpWbWAYKUEIRw1WF0LhLXM+dMdri5NR8ALmzQp9+cbMFUSs07wH/QU2M/rBmOhQAAAABJRU5ErkJggg==');
  background-position: center;
  background-size: contain;
  cursor: pointer;
  z-index: 99999999999;    
}
`;
    }

    async init(event, arg) {
        this.settings = arg.settings;
        this.displays = arg.displays;

        this.win.setTitle(this.settings.title);
        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            ipcRenderer.send('show-context-menu');
        });
        window.print = () => {
            ipcRenderer.send('print', document.body.innerHTML);
        };

        // console.log(`typeof print_check:`, typeof print_check)
        if (typeof print_check === 'function') {
            window.print_check = (html) => {
                ipcRenderer.send('print', html);
            };
        }

        const isDebug = this.settings.debug;

        window._APP_ = this;

        window._logger = new Proxy(console, {
            get: function (target, name) {
                return isDebug === true ? target[name] : () => {};
            },
        });

        _logger.log(`settings preload`, this.settings);

        const settingsEvent = new CustomEvent('settings', {
            detail: this.settings,
        });
        window.dispatchEvent(settingsEvent);

        this.addPageListeners();

        if (this.preference !== null) {
            webFrame.setZoomFactor(this.preference.zoom);
        }
    }

    defineSettings(event, arg) {
        this.settings = arg.settings;
        this.win.setTitle(this.settings.title);
        this.win.setKiosk(this.settings.kiosk);
        // this.win.setFrame(this.settings.frame); // it dont work ((

        // remove old
        const cssSel = document.querySelector(`[data-selector="css-style"]`);
        const controlContainerSel = document.querySelector(
            `[data-selector="control-container"]`
        );

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

        ipcRenderer.send('request-mainprocess-action', {
            action: 'getSettings',
        });
    }

    addPageListeners() {
        const selector = document.querySelector('#closeapp');

        if (selector) 
            selector.remove();
            if (this.settings.showMinimizeButton) {
                const css = document.createElement('link');
                css.setAttribute('rel', 'stylesheet');
                css.setAttribute('data-selector', `css-style`);

                const positions = {
                    TOP_LEFT: ['top: 0;', 'left: 0;'].join('\n'),
                    TOP_RIGHT: ['top: 0;', 'right: 0;'].join('\n'),
                    BOTTOM_LEFT: ['bottom: 0;', 'left: 0;'].join('\n'),
                    BOTTOM_RIGHT: ['bottom: 0;', 'right: 0;'].join('\n')
                };

                this.css = this.css.replace(
                    '%_MARGIN_%',
                    this.settings.buttonMargin || '10px'
                );
                this.css = this.css.replace(
                    '%_MINIMIZE_ICON_URL_%',
                    this.settings.minimizeIconUrl
                );
                this.css = this.css.replace(
                    '%_MAXIMIZE_ICON_URL_%',
                    this.settings.maximizeIconUrl
                );
                this.css = this.css.replace(
                    '%_POSITION_%',
                    positions[this.settings.buttonPosition] ||
                        positions.TOP_RIGHT
                );

                css.setAttribute(
                    'href',
                    `data:text/css;base64,${btoa(this.css)}`
                );
                document.head.appendChild(css);

                const control = document.createElement('div');
                control.setAttribute('class', 'control-container');
                control.setAttribute('data-selector', 'control-container');
                document.body.appendChild(control);

                control.addEventListener('click', () => {
                    const value = !this.win.isKiosk();
                    this.win.setKiosk(value);

                    if (value) {
                        control.classList.remove('minimized');
                    } else {
                        control.classList.add('minimized');
                    }
                });
            }
        
        const offline_btn = document.createElement('div');
        offline_btn.setAttribute('class', 'offline_icon');
        offline_btn.setAttribute('data-selector', 'offline_icon');
        document.body.appendChild(offline_btn);

        offline_btn.addEventListener('click', () => {
            ipcRenderer.send('request-mainprocess-action', {
                action: 'goToOffline',
            });
        });

        window.addEventListener(
            'keydown',
            (e) => {
                if (e.keyCode === 83 && e.altKey && e.ctrlKey) {
                    //CTRL+ALT+S
                    ipcRenderer.send('request-mainprocess-action', {
                        action: 'openSettings',
                    });
                }

                if (e.keyCode === 46 && e.shiftKey && e.ctrlKey) {
                    //CTRL+SHIFT+DELETE
                    ipcRenderer.send('request-mainprocess-action', {
                        action: 'flushStore',
                    });
                }

                if (e.keyCode === 81 && e.shiftKey && e.ctrlKey) {
                    //CTRL+SHIFT+Q
                    ipcRenderer.send('request-mainprocess-action', {
                        action: 'openDevTools',
                    });
                }

                if (e.keyCode === 90 && e.altKey && e.ctrlKey) {
                    //CTRL+AlT+Z
                    ipcRenderer.send('request-mainprocess-action', {
                        action: 'clearCache',
                    });
                }
            },
            true
        );

        window.addEventListener(
            'build',
            function (e) {
                ipcRenderer.send('request-mainprocess-action', {
                    action: 'clearCache',
                });
            },
            false
        );

        window.addEventListener(
            '404',
            function (e) {
                // ipcRenderer.send('request-mainprocess-action', {
                //     action: 'clearCache',
                // });
                console.log('We have 404 error!!!!!!!!!');
            },
            false
        );
    }
}

window.addEventListener('load', () => {
    window._APP_ = new AppView();
});
