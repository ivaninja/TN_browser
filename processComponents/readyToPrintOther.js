module.exports = function () {
    this.printWin.webContents.print({
        deviceName:this.settings.ticketPrinter,
        silent: true
    });
};
