const checkConnection = require('../helpers/checkConnection');

module.exports = async function () {
    this.isOnline = await checkConnection(this.settings.checkOnlineUrl);    
    if (!this.isOnline) {
        this.windows.forEach((win, index) => {
            let currentURL = win.webContents.getURL();
            var strPos = currentURL.indexOf("offline");
            var strPos2 = currentURL.indexOf("error");
            if((strPos==-1)&&(strPos2==-1))
            {
                win.loadURL(this.settings.urls[index].offlineUrl);
            }            
        });
    }
    
    setTimeout(() => {
        this.checkOnline();
    }, this.settings.checkOnlineTimeout);
}
