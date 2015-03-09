
var stringify = function(args) {
    return Array(args);
};


// Todo add a collectionLocalStorage (extending LocalStorage)
function LocalStorage (proxiedFunctions) {
    this._store = {};
    proxiedFunctions.forEach(function (fname) {
        this._store[fname] = {};
        this[fname] = function() {
            var args = stringify(arguments);
            return (args in this._store[fname]) ?
                // 1 - The function have already been called with thoses arguments
                Promise.resolve(this._store[fname][args]):
                // 2 - The result of the function is unknown
                Promise.reject('No data for ' + fname + '(' + args.slice(1,-1) + ')');
        };
    }.bind(this));

}

LocalStorage.prototype._save = function(fname, args, result) {
    args = stringify(args);
    if (!(fname in this._store)) {
        return Promise.reject('The function is not in the list of the proxyfied function');
    }
    this._store[fname][args] = {};
    return Promise.resolve(result);
};

LocalStorage.prototype._flushWhen = function (isResult) {
    for(var fname in this._store) {
        var results = this._store[fname];
        for (var args in results) {
            if (isResult(results[args])) {
                delete results[args];
            }
        }
    }
};

LocalStorage._flushAll = function () {
    this._deleteWhen(function () {
        return true;
    });
};

module.exports = LocalStorage;