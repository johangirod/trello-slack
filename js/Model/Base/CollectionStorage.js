var CollectionStore = require('./CollectionStore');

function CollectionStorage (store) {
	this._functions = {};
	this._store = new CollectionStore(store);

	// getById is automatically added.
	this['getById'] = this._store.call.bind(this._store, 'getById');
}

CollectionStorage.prototype._addFunction = function (fname, isResultOf) {
	this._functions[fname] = isResultOf;
	this[fname] = this._store.call.bind(this._store, fname);
};

CollectionStorage.prototype._saveResult = function (fname, args, result) {
	// 1 - Update saveById
	if (Array.isArray(result)) {
		result.map(function (project) {
			this._store.save('getById', [project.id], project)
		})
	} else {
		this._store.save('getById', [result.id], result)
	}
	// 2 - Save for the actual function
	return this._store.save(fname, args, result);
};


CollectionStorage.prototype._addRessource = function (ressource) {
	// Todo : update only it's changed
	return Promise.all([
		this._store.save('getById', [ressource.id], ressource)
	].concat(
		Object.keys(this._functions).map(function (fname) {
			return this._store.update(fname, ressource, this._functions[fname])
		}.bind(this))
	));
};

CollectionStorage.prototype._updateRessource = function (ressource) {
	// Todo : update only it's changed
	return Promise.all([
		this._store.changeResult('getById', [ressource.id], ressource)
	].concat(
		Object.keys(this._functions).map(function (fname) {
			return this._store.update(fname, ressource, this._functions[fname])
		}.bind(this))
	));
};

CollectionStorage.prototype._deleteRessource = function (ressource) {
	// Todo : update only it's changed
	return Promise.all([
		this._store.changeResult('getById', [ressource.id], null)
	].concat(
		Object.keys(this._functions).map(function (fname) {
			return this._store.update(fname, ressource, function(){ return false;})
		}.bind(this))
	));
};

module.exports = CollectionStorage;
