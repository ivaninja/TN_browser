const path = require('path');

module.exports = function (isDev) {
    return isDev ?
        path.resolve(`${path.dirname(process.execPath)}/../../../`) : // ../../../node_modules/electron/dist
        path.resolve(`${path.dirname(process.execPath)}`)
};
