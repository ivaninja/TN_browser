module.exports = function () {
    this.printWin.webContents.print({
        silent: true,
        margins: {
            marginType: 'custom',
            top: 0,
            bottom: 0,
            left: 0,
            right: 20,
        },
        dpi: {
            horizontal: 600,
            vertical: 600,
        },
    });
};
