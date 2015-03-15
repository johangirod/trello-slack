
// Private, static functions
var getFromStorage = function (storage, fname, args) {
    var storagePromise = null;
    if (!(storage[fname] && typeof storage[fname] === 'function')) {
        storagePromise = Promise.reject('No method ' + fname + ' for this storage', storage);
    } else {
        storagePromise = Promise.resolve(storage[fname].apply(storage, args));
    }
    return storagePromise;
};

var updatePreviousStorages = function (storages, fname, args, result) {
    storages.forEach(function (storage) {
        storage._save(fname, args, result);
    });
};


// Should be abstract
function StorageManager (storages, proxyFunctions) {
    this._storages = storages;
    proxyFunctions.forEach(function (fname) {
        this[fname] = this._call.bind(this, fname);
    }.bind(this));
}
/*
 * Calls a function in storage chain. If the first storage reject, calls the same function on the second etc.
 * Return a promise resolving to the first non rejected promise in storage list.
 *
 * usage : call(function-name, <function arg>)
 */
StorageManager.prototype._call = function() {
    var fname = arguments[0];
    var args = Array.prototype.slice.call(arguments, 1);
    var storages = this._storages;
    return this._storages.reduce(function (promiseChain, storage, i) {
        return promiseChain.then(
            function success (result) {
                updatePreviousStorages(storage.slice(0,i), fname, args, result);
                return result;
            },
            function error () {
                return getFromStorage(storage, fname, args);
            });
    }, Promise.reject())
    // No data even after calling every storage
    .catch(function (e) {
        return Promise.reject('No storage can answer this function call. \n \tLast storage error message: ' + e +'\n \tLast storage stack trace: ' + e.stack );
    });
};


StorageManager.prototype._broadcast = function () {
    var fname = arguments[0];
    var args = Array.prototype.slice.call(arguments, 1);
    return Promise.all(this._storages
        // Remove storage that don't provide this function from the list
        .filter(function (storage) {
            return storage[fname] && typeof storage[fname] === 'function';
        })
        // Call the function on all storage
        .map(function (storage) {
            return Promise.resolve(storage[fname].apply(storage, '_deleteWhen', args));
        })
    );
};

// Slightiest domain oriented functions
StorageManager.prototype._flushWhen = function (condition) {
    return this._broadcast('_flushWhen', condition);
};

StorageManager.prototype._flushAll = function () {
    this._broadcast('_flushAll');
};

StorageManager.prototype._flushById = function (id) {
    return this._deleteWhen(function (object) {
        return (
            // array and contains searched id
            (array.constructor === Array && array.some(function (object) {
                return object.id === id;
            })) ||
            // Or its the object and has searched id
            object.id && object.id === id
        );
    });
};

module.exports = StorageManager;