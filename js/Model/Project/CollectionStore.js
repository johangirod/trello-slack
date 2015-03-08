
// This is needed for the intelligent storage of ressource object (ie: object with an id)
// Can use any type of storage
var stringify = function (args) {
	return JSON.stringify(Array.prototype.slice.call(args));
};

var parse = function (str) {
	return JSON.parse(str);
};

function CollectionStore(store) {
	this.store = store;
}

CollectionStore.prototype.call = function () {
	var fname = arguments[0]
	var args = Array.prototype.slice.call(arguments, 1);
	return this.store.get(fname, stringify(args));
}

CollectionStore.prototype.save = function (fname, args, result) {
	return this.store.save(fname, stringify(args), result)
}

CollectionStore.prototype.changeResult = function (fname, args, newValueFn) {
	var args = stringify(args);
	// Lift value with function if needed.
	newValueFn = (typeof newValueFn === 'function') ?
		newValueFn:
		function() {return newValueFn;};
	return this.store.get(fname, args).then(function (result) {
		return this.store.save(fname, args, newValueFn(result));
	}.bind(this))
}

CollectionStore.prototype.removeIfExists = function (fname, args, ressource) {
	return this.changeResult(fname, args, function (oldValue) {
		if (!Array.isArray(result)) {
			return null
		}
		// If its an array, we remove only the ressource asked.
		return result.filter(function (r) {
			r.id !== ressource.id;
		});
	})
}

CollectionStore.prototype.addIfExists = function (fname, args, ressource) {
	return this.changeResult(fname, args, function (result) {
		if (!Array.isArray(result)) {
			return ressource
		} 
		// If its an array, we add the ressource
		result.push(ressource);
		return result;
	})
}

CollectionStore.prototype.update = function (fname, ressource, isResultOf) {
	return this.store.keys(fname).then(function (keys) {
		return Promise.all(keys.map(function (key) {
			var args = parse(key)
			return this.removeIfExists(fname, args, ressource).finally(function () {
				if (isResultOf(args, ressource)) {
					return this.addIfExists(fname, args, ressource)
				}
			})
		}))
	})
}
