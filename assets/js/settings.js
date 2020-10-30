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

        this.settings = settings;

        this.cancelSelector = document.querySelector('[data-selector="cancel-btn"]');
        this.init();
    }

    init() {

        this.cancelSelector.addEventListener('click', () => {
            _APP_.ipcRenderer.send('request-mainprocess-action', {action: 'cancelSettings', data: this.model});
        })

        const submodels = document.querySelectorAll('[submodel]');


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

}

window.addEventListener('settings', (e) => {
    new AppViewSettings(e.detail);
})
