var LocalStore          = require('./Base/LocalStore');
var StorageManager      = require('./Base/StorageManager');
var CollectionStorage   = require('./Base/CollectionStorage');

var connector      = require('../connector/TrelloConnector');


var TrelloMemberReader = {
	getMe: function() {
	    return connector.request("get","/members/me");
	}
};


// Set up the collectionStorage, by informing the saved functions, and the cache accuracy function
var collectionStorage = new CollectionStorage(new LocalStore());
collectionStorage._addFunction('getMe', function () {
	
});

/*
 *  MemberManager extends StorageManager
 */
function MemberManager() {
    StorageManager.call(this,
        [new CollectionStorage(['getMe']), TrelloMemberReader], // Storages
        ['getMe']
    );
}
MemberManager.prototype = Object.create(StorageManager.prototype);

module.exports = new MemberManager();