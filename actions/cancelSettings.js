module.exports = function(event, arg) {
    this.isOnline ? this.windows[0].loadURL(this.settings.urls[0].url) : this.windows[0].loadURL(this.settings.urls[0].offlineUrl) ;    
}
