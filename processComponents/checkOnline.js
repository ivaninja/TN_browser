const checkConnection = require('../helpers/checkConnection');

module.exports = async function () {
    this.isOnline = await checkConnection();    
    if (!this.isOnline) {
        this.windows.forEach((win, index) => {
            let currentURL = win.webContents.getURL();
            console.log(currentURL);
            var strPos = currentURL.indexOf("offline");
            if(strPos==-1)            
                win.loadURL(this.settings.urls[index].offlineUrl);
        });
    }
    
    setTimeout(() => {
        this.checkOnline();
    }, this.settings.checkOnlineTimeout);
}
