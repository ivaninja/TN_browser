class AppViewSettings {
    constructor(settings) {

        const {debug, version, workDirectory, ...other} = settings;

        this.model = {
            ...other
        };

        this.settingsDetails = {
            buttonMargin: {
                type: `text`,
                label: `Button margin`
            },

            buttonPosition: {
                label: `Button position`,
                type: 'select',
                values: [
                    `TOP_LEFT`,
                    `TOP_RIGHT`,
                    'BOTTOM_RIGHT',
                    'BOTTOM_LEFT',
                ],
            },

            defaultUrl: {
                type: `text`,
                label: `Default Url`
            },

            kiosk: {
                type: `checkbox`,
                label: `Kiosk Mode`
            },

            maximizeIconUrl: {
                type: `text`,
                label: `Maximize Icon Url`
            },

            minimizeIconUrl: {
                type: `text`,
                label: `Minimize Icon Url`
            },

            title: {
                type: `text`,
                label: `Title`
            },

            frame: {
                type: `checkbox`,
                label: `frame mode`
            },

            height: {
                type: `number`,
                label: `Window height`
            },

            width: {
                type: `number`,
                label: `Window width`
            },

        };

        this.settings = settings;

        this.settingsAreaSelector = document.querySelector('[data-selector="settings-area"]');


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

        document.querySelector('[data-selector="form"]')
            .addEventListener('submit',
                (ev) => {
                    console.log(this.model)
                    ev.stopPropagation();
                    ev.preventDefault();
                })


    }

    render() {
        this.renderTemplate({
            type: 'text',
            destination: this.settingsAreaSelector,
        })
    }

    getTemplate(type) {
        return document.querySelector(`[data-selector="${type}-template"]`).innerHTML;
    }

    renderTemplate({type, destination = document.body, data, cleanDestination = true}) {
        let template = this.getTemplate(type);

        Object.keys(data).forEach((key) => {
            template = template.replace(`{{${key}}`, data[key]);
        });

        if (cleanDestination) {
            destination.innerHTML = '';
        }

        destination.appendChild(template);
    }

}

window.addEventListener('settings', (e) => {
    new AppViewSettings(e.detail);
})
