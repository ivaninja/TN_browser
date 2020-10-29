const {ipcRenderer} = require('electron');


class UpdatePreload {

    constructor() {
        console.log(`start`)
        this.progressbarSelector = document.querySelector('[role="progressbar"]');
        this.progressSelector = document.querySelector('#progress');
        this.checkSelector = document.querySelector('#check');


        ipcRenderer.on('message', (event, message) => {
            console.log(message)
            if (message.action) {
                this[data.action](message.data)
            }
        });
    }

    checkingForUpdate(){

    }

    cheking() {

    }

    updateAvailable() {
        // this.checkTextSelector.innerTEXT = 'Update available, start to download...';
        this.checkSelector.style.display = 'none';
        this.progressSelector.style.display = 'block';
        this.progressbarSelector.style.width = '0%';
    }

    download(percents) {
        this.progressbarSelector.style.width = `${percents}%`;
    }

}

window.addEventListener('load', () => {
    new UpdatePreload();
});


