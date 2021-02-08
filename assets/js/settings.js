class AppViewSettings {

    constructor(settings) {

        const {debug, version, workDirectory, ...other} = settings;

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

        this.urlModel = [];

        this.displays = _APP_.displays;

        this.settings = settings;

        this.cancelSelector = document.querySelector('[data-selector="cancel-btn"]');
        this.addUrlSel = document.querySelector('[data-selector="addUrl"]');

        this.urlsInputs = document.querySelector('[data-selector="urls-inputs"]');


        this.init();
    }

    init() {

        this.cancelSelector.addEventListener('click', () => {
            _APP_.ipcRenderer.send('request-mainprocess-action', {action: 'cancelSettings', data: this.model});
        })

        const submodels = document.querySelectorAll('[submodel]');


        this.addUrlSel.addEventListener('click', () => {

            this.model.urls.push({
                url: '',
                displayId: 0,
            });

            this.renderUrlsInputs();
        });


        this.renderUrlsInputs();

        document.querySelectorAll('[model]')
            .forEach((item) => {

                let eventType = 'onkeyup';
                let valueName = 'value';
                const modelName = item.getAttribute('model');
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

                item[valueName] = this.model[modelName];
                item[eventType] = (ev) => {
                    this.model[modelName] = AsType(ev.target[valueName])
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

    removeUrlsItem(index) {
        this.model.urls.splice(index, 1);
        this.renderUrlsInputs();
    }

    renderUrlsInputs() {
        this.urlsInputs.innerHTML = "";

        this.model.urls.forEach((item, index) => {
            this.urlsInputs.innerHTML += this.createUrlInput({
                index,
                displayId: item.displayId,
            });
        });

        const removeUrlItem = document.querySelectorAll(`[data-action="removeUrlItem"]`);
        const setUrlItemDisplay = document.querySelectorAll(`[data-action="setUrlItemDisplay"]`);
        const setUrlItemUrl = document.querySelectorAll(`[data-action="setUrlItemUrl"]`);

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
                console.log(this.model.urls)
            };
        });

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
