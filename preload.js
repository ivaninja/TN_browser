const { log } = require('console');
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
  margin: %_MARGIN_%;
  position: fixed;
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
    margin: %_MARGINOFFLINE_%;
  position: fixed;
  %_POSITIONOFFLINE_%
  width: 36px;
  height: 36px;
  border: 1px solid #ceced0;
  border-radius: 4px;
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIUAAACFCAYAAAB12js8AAABNWlDQ1BBZG9iZSBSR0IgKDE5OTgpAAAokZWPv0rDUBSHvxtFxaFWCOLgcCdRUGzVwYxJW4ogWKtDkq1JQ5XSJNxc//QhHN06uLj7BE6OgoPiE/gGilMHhwjBqfSbvvPjcDg/MCp23WkYZRjEWrWbjnQ9X86/MscMAHTCLLVbrSOAOIkj/iPg5wMB8LZt150G07EYpkoDY2C3G2UhiArQv9apBjECzKCfahCPgKnO2jUQz0Cpl/s7UApy/wRKyvV8EN+A2XM9H4wFwAxyXwNMHd1ogFqSDtVF71zLqmVZ0u4mQSRPh5mOBpk8jMNEpYnq6KgL5P8BsJwvtpuO3Kha1sHmlL0n4nq+zO3rBAGIlZciKwgv1dWfCmNv8lzcGK3C8QPMjots/xbut2DprsjWq1DegafRL8KzT/57sqVFAAAACXBIWXMAAB7CAAAewgFu0HU+AAAMomlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDg4LCAyMDIwLzA3LzEwLTIyOjA2OjUzICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIiB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjEuMiAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIxLTAzLTIzVDE4OjAxOjU3KzAzOjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMi0wNC0wN1QxOTowMDoxNiswMzowMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyMi0wNC0wN1QxOTowMDoxNiswMzowMCIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJBZG9iZSBSR0IgKDE5OTgpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjAyMmZkMTM5LTM2M2MtYTE0Mi1hOWM2LTY4ZDI1MGFjYjlkZCIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOmExNTk4Mzg3LTQxMmQtNDA0ZC1iOGI5LWEyNTA3Y2ZiNWRhMiIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjBkOTE2NzFlLWUxZjktN2E0Yi1hNGY5LTVmNWIwNTExZjg5NiIgdGlmZjpPcmllbnRhdGlvbj0iMSIgdGlmZjpYUmVzb2x1dGlvbj0iMjAwMDAwMC8xMDAwMCIgdGlmZjpZUmVzb2x1dGlvbj0iMjAwMDAwMC8xMDAwMCIgdGlmZjpSZXNvbHV0aW9uVW5pdD0iMiIgZXhpZjpDb2xvclNwYWNlPSI2NTUzNSIgZXhpZjpQaXhlbFhEaW1lbnNpb249IjEzMyIgZXhpZjpQaXhlbFlEaW1lbnNpb249IjEzMyI+IDxwaG90b3Nob3A6RG9jdW1lbnRBbmNlc3RvcnM+IDxyZGY6QmFnPiA8cmRmOmxpPkMzMkE5NDY3RUU2QUQ3NjUyNTgxM0E4QTg3QzEwQTI2PC9yZGY6bGk+IDxyZGY6bGk+YWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOmI0ZGE5M2M3LTkyMGUtNDk0Ni1hOTQ3LWIwNTAxZDgyNzc3MDwvcmRmOmxpPiA8L3JkZjpCYWc+IDwvcGhvdG9zaG9wOkRvY3VtZW50QW5jZXN0b3JzPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjBkOTE2NzFlLWUxZjktN2E0Yi1hNGY5LTVmNWIwNTExZjg5NiIgc3RFdnQ6d2hlbj0iMjAyMS0wMy0yM1QxODowMTo1NyswMzowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIxLjIgKFdpbmRvd3MpIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjb252ZXJ0ZWQiIHN0RXZ0OnBhcmFtZXRlcnM9ImZyb20gaW1hZ2UvcG5nIHRvIGFwcGxpY2F0aW9uL3ZuZC5hZG9iZS5waG90b3Nob3AiLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmE5M2MwNWFkLTA2NzAtMDg0Mi04MDA2LWMzMWFlZjM5Zjg2YyIgc3RFdnQ6d2hlbj0iMjAyMS0wMy0yM1QyMDoyODoxMyswMzowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIxLjIgKFdpbmRvd3MpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDoxMWIwNDA5NC0xZDMzLTAxNDgtODE3ZS0wZDdmZDNmNmQ0MTkiIHN0RXZ0OndoZW49IjIwMjItMDQtMDdUMTg6NTk6MzUrMDM6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMi4wIChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY29udmVydGVkIiBzdEV2dDpwYXJhbWV0ZXJzPSJmcm9tIGFwcGxpY2F0aW9uL3ZuZC5hZG9iZS5waG90b3Nob3AgdG8gaW1hZ2UvcG5nIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJkZXJpdmVkIiBzdEV2dDpwYXJhbWV0ZXJzPSJjb252ZXJ0ZWQgZnJvbSBhcHBsaWNhdGlvbi92bmQuYWRvYmUucGhvdG9zaG9wIHRvIGltYWdlL3BuZyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6ODc5YWNiYjktMDlhNC1lNzQ0LTkzNTItYjllNjYxZjhhODIyIiBzdEV2dDp3aGVuPSIyMDIyLTA0LTA3VDE4OjU5OjM1KzAzOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjIuMCAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjAyMmZkMTM5LTM2M2MtYTE0Mi1hOWM2LTY4ZDI1MGFjYjlkZCIgc3RFdnQ6d2hlbj0iMjAyMi0wNC0wN1QxOTowMDoxNiswMzowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIyLjAgKFdpbmRvd3MpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDoxMWIwNDA5NC0xZDMzLTAxNDgtODE3ZS0wZDdmZDNmNmQ0MTkiIHN0UmVmOmRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDpiNGRhOTNjNy05MjBlLTQ5NDYtYTk0Ny1iMDUwMWQ4Mjc3NzAiIHN0UmVmOm9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDowZDkxNjcxZS1lMWY5LTdhNGItYTRmOS01ZjViMDUxMWY4OTYiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/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');
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
        
        const test = this.settings.buttonMargin.replace(/px/g, '').split(' ');
        let top = Number(test[0]);
        let right = (positions[this.settings.buttonPosition]==
        positions.TOP_RIGHT || positions[this.settings.buttonPosition]==
        positions.BOTTOM_RIGHT) ? Number(test[1])+50 : Number(test[1]);
        let bottom = Number(test[2]);
        let left = (positions[this.settings.buttonPosition]==
            positions.TOP_LEFT  || positions[this.settings.buttonPosition]==
            positions.BOTTOM_LEFT) ? Number(test[3])+50 : Number(test[3]);
        this.css = this.css.replace(
            '%_MARGINOFFLINE_%',
            `${top}px ${right}px ${bottom}px ${left}px` || '10px'
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
        this.css = this.css.replace(
            '%_POSITIONOFFLINE_%',
            positions[this.settings.buttonPosition] ||
                positions.TOP_RIGHT
        );

        css.setAttribute(
            'href',
            `data:text/css;base64,${btoa(this.css)}`
        );
        document.head.appendChild(css);
        if ((this.preference.url.indexOf("display")==-1) && this.settings.showMinimizeButton) {
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
            
        if (this.preference.url.indexOf("display") ==-1)
        {
            const offline_btn = document.createElement('div');
            offline_btn.setAttribute('class', 'offline_icon');
            offline_btn.setAttribute('data-selector', 'offline_icon');
            document.body.appendChild(offline_btn);

            offline_btn.addEventListener('click', () => {
                ipcRenderer.send('request-mainprocess-action', {
                    action: 'goToOffline',
                });
            });
        }
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
