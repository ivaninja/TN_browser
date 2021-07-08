const checkConnection = require('../helpers/checkConnection');

module.exports = async function () {
    this.isOnline = await checkConnection();

    if (!this.isOnline && !this.isRedirectedToError) {
        this.windows.forEach((win, index) => {
            win.loadURL(this.settings.urls[index].offlineUrl);
        });

        this.isRedirectedToError = true;
    }

    if (this.isOnline && this.isRedirectedToError) {

        this.windows.forEach((win, index) => {
            win.loadURL(this.settings.urls[index].url);
        });

        this.isRedirectedToError = false;
    }

    setTimeout(() => {
        this.checkOnline();
    }, this.settings.checkOnlineTimeout);
}
