

module.exports = function () {
    this.printWin.setAutoResize({
        width: true,
        height: true,
        horizontal: true,
        vertical: true
    })
    this.printWin.webContents.print({
        silent: true, margins: {
            marginType: "custom",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
        }
    });
}
