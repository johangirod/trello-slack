var LocalStorage        = require('../Storage/LocalStorage');
var StorageManager      = require('../Storage/Manager');

var MemberManager       = require('../MemberManager');
var TrelloProjectReader = require('./TrelloProjectReader');

// Proxied functions (directly proxied to storages)
var PROXIED_FUNCTIONS = ['getById'];
var SAVED_FUNCTIONS = ['getMyProjects', 'getProjectByChannelName', 'getById'];

/*
 *  ProjectManager extends StorageManager
 */
function ProjectManager() {
    StorageManager.call(this,
        [new LocalStorage(SAVED_FUNCTIONS), TrelloProjectReader], // Storages
        PROXIED_FUNCTIONS
    );
}

ProjectManager.prototype = Object.create(StorageManager.prototype);
ProjectManager.prototype.setBoardsIds = function (boards) {
	this.idBoards = Object.keys(boards).map(function (name) {
		return boards[name];
	});
};
ProjectManager.prototype.isMyProject = function(project) {
	return MemberManager.getMe().then(function (me) {
	    return _.where(project.members,{id: me});
	});
};
ProjectManager.prototype.getProjectByChannelName = function(channelName) {
	return this._call('getProjectByChannelName', this.idBoards, channelName);
};
ProjectManager.prototype.getMyProjects = function() {
	return this._call('getMyProjects', this.idBoards);
};
module.exports = new ProjectManager();