const checkConnection = require('../helpers/checkConnection');
const axios = require("axios");

module.exports = async function () {
    this.isOnline = await checkConnection(this.settings.checkOnlineUrl);
    console.log('checkOnline->',this.isOnline);    
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
        if((typeof this.settings.hidekeyboard!= "undefined") && (this.settings.hidekeyboard == true))
        {
            axios.post("http://localhost:7000/hidekeyboard").catch(error => {               
                console.error('axios post error!', error);
            });
        }
    }
    
    setTimeout(() => {
        this.checkOnline();
    }, this.settings.checkOnlineTimeout);
}
