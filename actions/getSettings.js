module.exports = function(event, arg) {
    event.sender.send('mainprocess-response', {
        action: 'init',
        settings: this.settings,
        displays: this.screen.getAllDisplays(),
        printers: this.printers 
    });
}
