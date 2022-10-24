module.exports = function (event, commandLine, workingDirectory) {
    this.reopenWindows();
    this.windows.forEach((win) => {
        if (win.isMinimized()) {
            win.restore();
        }
        win.focus();
    })
};
