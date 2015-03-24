var LocalStore          = require('../Base/LocalStore');
var StorageManager      = require('../Base/StorageManager');
var CollectionStorage   = require('../Base/CollectionStorage');

var MemberManager       = require('../MemberManager');
var TrelloProjectReader = require('./TrelloProjectReader');

// Proxied functions (directly proxied to storages)
var PROXIED_FUNCTIONS = ['getById'];

// Set up the collectionStorage, by informing the saved functions, and the cache accuracy function
var collectionStorage = new CollectionStorage(new LocalStore());
collectionStorage._addFunction('getMyProjects', function (_, project) {
	return projectManager.isMyProject(project);
});
collectionStorage._addFunction('getProjectByChannelName', function (args, project) {
	return project.slack === args[2];
});


function ProjectManager() {
    StorageManager.call(this,
        [collectionStorage, TrelloProjectReader], // Storages
        PROXIED_FUNCTIONS
    );
}

ProjectManager.prototype = Object.create(StorageManager.prototype);
ProjectManager.prototype.isMyProject = function(project) {
	return MemberManager.getMe().then(function (me) {
	    return _.where(project.members,{id: me});
	});
};
ProjectManager.prototype.setBoardsIds = function (boards) {
	this.idBoards = Object.keys(boards).map(function (name) {
		return boards[name];
	});
};
ProjectManager.prototype.getProjectByChannelName = function(channelName) {
	return this._call('getProjectByChannelName', this.idBoards, channelName);
};

ProjectManager.prototype.getMyProjects = function() {
	return this._call('getMyProjects', this.idBoards);
};

ProjectManager.prototype.addProject = function (project) {
    return this._broadcast('_addRessource', project);
};

ProjectManager.prototype.updateProject = function (project) {
    return this._broadcast('_updateRessource', project);
};

ProjectManager.prototype.removeProject = function (project) {
    return this._broadcast('_removeRessource', project);
};

var projectManager = new ProjectManager();
module.exports = projectManager;