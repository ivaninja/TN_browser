class AppViewSettings {

    constructor(settings) {

        const {debug, version, workDirectory, ...other} = settings;

        this._defaultUrlItem = {
            url: '',
            displayId: 0,
            offlineUrl: '',
            zoom: 1
        };

        this.model = {
            ...other
        };

        this.submodel = {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,

            get value() {
                return `${this.top}px ${this.right}px ${this.bottom}px ${this.left}px`;
            },

            set value(val) {
                const test = val.replace(/px/g, '').split(' ');
                this.top = Number(test[0]);
                this.right = Number(test[1]);
                this.bottom = Number(test[2]);
                this.left = Number(test[3]);
            },
        };

        this.displays = _APP_.displays;
        this.printers = _APP_.printers.map(a => a.name);
        this.settings = settings;

        this.cancelSelector = document.querySelector('[data-selector="cancel-btn"]');
        this.addUrlSel = document.querySelector('[data-selector="addUrl"]');
        this.addUrlWhitelist = document.querySelector('[data-selector="addUrlWhitelist"]');

        this.urlsInputs = document.querySelector('[data-selector="urls-inputs"]');
        this.whiteurls = document.querySelector('[data-selector="whiteurls"]');
        this.whiteurlInput = document.querySelector('[data-selector="whiteurl"]');
        this.ticketPrinter = document.querySelector('[data-selector="ticketPrinter"]');


        this.init();
    }

    init() {

        this.cancelSelector.addEventListener('click', () => {
            _APP_.ipcRenderer.send('request-mainprocess-action', {action: 'cancelSettings', data: this.model});
        })

        const submodels = document.querySelectorAll('[submodel]');


        this.addUrlSel.addEventListener('click', () => {

            this.model.urls.push(this._defaultUrlItem);

            this.renderUrlsInputs();
        });

        this.addUrlWhitelist.addEventListener('click', () => {

            this.model.whitelist.push(this.whiteurlInput.value);

            this.renderWhitelist();

            this.whiteurlInput.value = '';
        });

        

        this.renderUrlsInputs();
        this.renderWhitelist();
        this.renderPrinterSelect()

        document.querySelectorAll('[model]')
            .forEach((item) => {

                let eventType = 'onkeyup';
                let valueName = 'value';
                const modelName = item.getAttribute('model');
                const dataSetter = item.getAttribute('data-setter');
                const dataGetter = item.getAttribute('data-getter');

                let getter = (value) => value;
                let setter = (value) => value;

                if (dataGetter) {
                    getter = this[dataGetter];
                }

                if (dataSetter) {
                    setter = this[dataSetter];
                }

                let AsType = String;

                switch (item.tagName) {
                    case 'INPUT':
                        if (item.type.toLowerCase() === 'checkbox') {
                            eventType = 'onchange';
                            valueName = 'checked';
                            AsType = Boolean;
                        }

                        if (item.type.toLowerCase() === 'number') {
                            eventType = 'onchange';
                            AsType = Number;
                        }
                        break;

                    case 'SELECT':
                        eventType = 'onchange'
                        break;
                }

                item[valueName] = getter(this.model[modelName]);
                item[eventType] = (ev) => {
                    this.model[modelName] = setter(AsType(ev.target[valueName]));
                }
            });

        this.submodel.value = this.model.buttonMargin;
        const buttonMarginSelector = document.querySelector('[model="buttonMargin"]');

        submodels.forEach((item) => {
            const modelName = item.getAttribute('submodel');
            item.value = this.submodel[modelName];

            item.onkeyup = (ev) => {
                this.submodel[modelName] = Number(ev.target.value)
                this.model.buttonMargin = this.submodel.value;
                buttonMarginSelector.value = this.submodel.value;
            }
        });

        document.querySelector('[data-selector="form"]')
            .addEventListener('submit',
                (ev) => {
                    ev.stopPropagation();
                    ev.preventDefault();
                    _APP_.ipcRenderer.send('request-mainprocess-action', {action: 'saveSettings', data: this.model});
                })
    }

    getZoom(value) {
        return value * 100;
    }

    setZoom(value) {
        return value / 100;
    }

    removeUrlsItem(index) {
        this.model.urls.splice(index, 1);
        this.renderUrlsInputs();
    }

    removeWhitelistItemF(index) {
        this.model.whitelist.splice(index, 1);
        this.renderWhitelist();
    }

    renderUrlsInputs() {
        this.urlsInputs.innerHTML = "";

        this.model.urls.forEach((item, index) => {
            this.urlsInputs.innerHTML += this.createUrlInput({
                index,
                displayId: item.displayId,
                // errorUrl: item.offlineUrl,
                // zoom: 1,
            });
        });
        const removeUrlItem = document.querySelectorAll(`[data-action="removeUrlItem"]`);
        const setUrlItemDisplay = document.querySelectorAll(`[data-action="setUrlItemDisplay"]`);
        const setUrlItemUrl = document.querySelectorAll(`[data-action="setUrlItemUrl"]`);
        const setOfflineItemUrl = document.querySelectorAll(`[data-action="setOfflineItemUrl"]`);
        const setZoomItemUrl = document.querySelectorAll(`[data-action="setZoomItemUrl"]`);

        removeUrlItem.forEach((item, index) => {
            item.onclick = (ev) => {
                this.removeUrlsItem(Number(ev.target.dataset.index));
            };

            if (index === 0) {
                item.remove();
            }
        })

        setUrlItemDisplay.forEach((item, index) => {
            item.value = this.model.urls[index].displayId;
            item.onchange = (ev) => {
                this.model.urls[Number(ev.target.dataset.index)].displayId = Number(ev.target.value);
            };
        });

        setUrlItemUrl.forEach((item, index) => {
            item.value = this.model.urls[index].url;
            item.onkeyup = (ev) => {
                this.model.urls[Number(ev.target.dataset.index)].url = ev.target.value;
                // console.log(this.model.urls)
            };
        });

        setOfflineItemUrl.forEach((item, index) => {
            item.value = this.model.urls[index].offlineUrl;
            item.onkeyup = (ev) => {
                this.model.urls[Number(ev.target.dataset.index)].offlineUrl = ev.target.value;
                // console.log(this.model.urls)
            };
        });

        setZoomItemUrl.forEach((item, index) => {
            item.value = this.getZoom(this.model.urls[index].zoom);
            item.onkeyup = (ev) => {
                this.model.urls[Number(ev.target.dataset.index)].zoom = this.setZoom(ev.target.value);
            };
        });

    }

    renderPrinterSelect(){
        this.ticketPrinter.innerHTML = "";
        this.ticketPrinter.innerHTML += this.createPrintersSelect();
    }

    createUrlInput({value = '', index = 0, displayId = 0,}) {
        let options = ``;
        const optionsTemplate = this.getTemplate(`display-option`);
        const urlTemplate = this.getTemplate(`url-input`);

        this.displays.forEach((item) => {

            options += this.addDataToTemplate(optionsTemplate, {
                value: item.id,
                name: `#id: ${item.id} (${item.size.width}x${item.size.height})`,
                selected: item.id === displayId ? 'selected' : ''
            });

        });

        return this.addDataToTemplate(urlTemplate, {
            containerSelector: 'inputUrlSelector',
            value,
            index,
            options,
        });
    }

    createPrintersSelect(){
        let options = ``;
        const optionsTemplate = this.getTemplate(`printer-option`);
        const printerTemplate = this.getTemplate(`printer-select`);
        this.printers.forEach((item) => {
            options += this.addDataToTemplate(optionsTemplate, {                
                name: item,
                selected: item === this.model.ticketPrinter ? 'selected' : ''
            });
        });
        return this.addDataToTemplate(printerTemplate, {            
            options,
        });

    }

    createWhitelistItem({index = 0, url = '',}) {
        const urlTemplate = this.getTemplate(`url-whitelist`);
        
        return this.addDataToTemplate(urlTemplate, {
            containerSelector: 'WhitelistItem',
            url,
            index,            
        });
    }

    renderWhitelist() {
        this.whiteurls.innerHTML = "";

        this.model.whitelist.forEach((url, index) => {
            this.whiteurls.innerHTML += this.createWhitelistItem({
                index,
                url
            });
        });
        const removeWhitelistItem = document.querySelectorAll(`[data-action="removeWhitelistItem"]`);
        
        removeWhitelistItem.forEach((item, index) => {
            item.onclick = (ev) => {
                this.removeWhitelistItemF(Number(ev.target.dataset.index));
            };
        })        
    }

    getTemplate(id) {
        return document.querySelector(`#${id}`).innerHTML;
    }

    addDataToTemplate(template, data) {
        Object.keys(data).forEach((key) => {
            template = template.replace(
                new RegExp(`\{\{${key}\}\}`, `g`),
                data[key]
            );
        });

        return template;
    }

}

window.addEventListener('settings', (e) => {
    new AppViewSettings(e.detail);
})
