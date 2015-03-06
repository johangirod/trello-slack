var LocalStorage   = require('./Storage/LocalStorage');
var StorageManager = require('./Storage/Manager');
var connector      = require('../connector/TrelloConnector');


var TrelloMemberReader = {
	getMe: function() {
	    return connector.request("get","/members/me");
	}
};

/*
 *  MemberManager extends StorageManager
 */
function MemberManager() {
    StorageManager.call(this,
        [new LocalStorage(['getMe']), TrelloMemberReader], // Storages
        ['getMe']
    );
}
MemberManager.prototype = Object.create(StorageManager.prototype);

module.exports = new MemberManager();