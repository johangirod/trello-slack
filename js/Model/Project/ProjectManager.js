var LocalStorage        = require('SPM/Model/Storage/LocalStorage');
var StorageManager      = require('SPM/Model/Storage/Manager');

var MemberManager       = require('SPM/Model/MemberManager');
var TrelloProjectReader = require('./TrelloProjectReader');

// Proxied functions (directly proxied to storages)
var PROXIED_FUNCTIONS = ['getMyProjects', 'getProjectByChannelName', 'getById'];
var SAVED_FUNCTIONS = PROXIED_FUNCTIONS;

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
ProjectManager.prototype.isMyProject = function(project) {
    return _.find(project.members, function(member) {
        return MemberManager.me.id == member.id;
    });
};

module.exports = new ProjectManager();