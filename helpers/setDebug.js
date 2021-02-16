module.exports = function (debug) {
    global._logger = new Proxy(console, {
        get: function (target, name) {
            return debug === true ? target[name]
                : () => {
                };
        }
    });
};
