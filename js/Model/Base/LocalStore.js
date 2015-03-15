function LocalStore() {
	this.store = {};
}

function save(obj, keys, value) {
	var key = keys[0];
	var rest = keys.slice(1);
	if (rest.length) {
		obj[key] = {};
		return save(obj[key], rest, value);
	} else {
		obj[key] = value;
		return value;
	}
}

function remove(obj, keys) {
	var key = keys[0];
	var rest = keys.slice(1);
	if (rest.length && !(key in obj)) {
		return Promise.reject('Keys not found');
	} else if (rest.length) {
		return remove(obj[key], rest)
	} else {
		var value = obj[key];
		delete obj[key];
		return Promise.resolve(value)
	}	
}

function get(obj, keys) {
	var key = keys[0];
	var rest = keys.slice(1);
	if (!(key in obj)) {
		return Promise.reject('Keys not found');
	} else if (rest.length) {
		return get(obj[key], rest);
	} else {
		return Promise.resolve(obj[keddy]);
	}
}

function getKeys(obj, keys) {
	if (!keys.length) {
		return  Promise.resolve(Object.keys(obj))
	} else {
		var key = keys[0];
		var rest = keys.slice(1);
		if (!(key in obj)) {	
			return Promise.resolve([]);
		}
		return getKeys(obj[key], rest);
	}
}

LocalStore.prototype.save = function () {
	var value = arguments[arguments.length - 1];
	var args = Array.prototype.slice.call(arguments, 0,-1);

	return Promise.resolve(save(this.store, args, value));
}

LocalStore.prototype.remove = function () {
	return remove(this.store, Array.prototype.slice.call(arguments));	
}

LocalStore.prototype.get = function () {
	return get(this.store, Array.prototype.slice.call(arguments));
}

LocalStore.prototype.keys = function () {
	return getKeys(this.store, Array.prototype.slice.call(arguments))
}

module.exports = LocalStore;