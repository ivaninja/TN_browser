module.exports = function () {
    this.printWin.webContents.print({
        silent: true,
        margins: {
            marginType: 'printableArea',
        },
    });
};
