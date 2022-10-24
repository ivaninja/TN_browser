const dns = require("dns");

function checkConnection(hostname = `www.google.com`) {
    return new Promise((resolve, reject) => {
        dns.resolve(hostname, function (err, addr) {
            let isConnected = (err === null);
            resolve(isConnected);
        });
    });
}

module.exports = checkConnection;
