function CollectionStorage (collectionStore) {
	this._functions = {};
	this._store = collectionStore;
}

CollectionStorage.prototype._addFunction = function (fname, isResultOf) {
	this.functions[fname] = isResultOf;
	this[fname] = this._store.call.bind(this._store, fname);
};

CollectionStorage.prototype._saveResult = function (fname, args, result) {
	// Todo : save in getById here
	return this._store.save(fname, args, result);
};

CollectionStorage.prototype._updateRessource = function (ressource) {
	return Promise.all([
		this.collectionStore.changeResult('getById', ressource.id, ressource)
	].concat(
		Object.keys(this.functions).map(function (fname) {
			return this._store.update(fname, ressource, this.functions[fname])
		})
	));
};
