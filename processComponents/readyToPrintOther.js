module.exports = function () {
    console.log(this.settings.ticketPrinter);
    this.printWin.webContents.print({
        deviceName:this.settings.ticketPrinter,
        silent: true
    });
};
