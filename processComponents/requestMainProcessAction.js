module.exports = function (event, arg) {
    _logger.log('action:', arg.action)
    this[arg.action](event, arg);
}
