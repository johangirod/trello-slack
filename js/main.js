window.Promise = require('bluebird')


var TrelloConnector       = require('./connector/TrelloConnector');
var MemberManager         = require('./Model/MemberManager');
var ProjectManager        = require('./Model/Project/ProjectManager');
var PanelRenderer         = require('./apps/ProjectPanel/views/PanelRenderer');
var PanelInitializer      = require('./apps/ProjectPanel/PanelInitializer');
var MyProjectsInitializer = require('./apps/MyProjects/MyProjectsInitializer');
var ToggleMenuInitializer = require('./apps/ToggleMenu/ToggleMenuInitializer');


var BOARD_IDS = {
    arborium: "54b94910f186c08595048a8f",
    seeds: "54b7c3955fdb8e63ba5819d8"
};


var initDate = moment();

var addProject = function(project) {
    return ProjectManager.getById(project.id)
        .then(ProjectManager.addProject.bind(ProjectManager))
};

var removeProject = function (project) {
    return ProjectManager.removeProject(project)
};

var updateProject = function (project) {
    return ProjectManager.removeProject(project).then(function () {
        return ProjectManager.getById(project.id)
    })
    .then(ProjectManager.addProject.bind(ProjectManager))
};

var wrapp = function (fn) {
    return function (snapshot) {
        var project = snapshot.val();
        if (!initDate.isBefore(moment(project.updated_at))) {
            return false;
        }
        return fn(project).then(function () {
            PanelInitializer.reload();
            MyProjectsInitializer.reload();
        });
    }
}

var setUpRealTime = function () {
    var f = new Firebase("https://trello.firebaseio.com/").child("projects");
    f.on("child_added", wrapp(addProject));
    f.on("child_changed", wrapp(updateProject));
    f.on("child_removed", wrapp(removeProject));
};

var init = function() {
    return TrelloConnector
        .initConnection()
        .then(function() {
            ProjectManager.setBoardsIds(BOARD_IDS);
            MyProjectsInitializer.setBoardIds(BOARD_IDS);
            return Promise.all([
                PanelInitializer.init(),
                MyProjectsInitializer.init(),
                ToggleMenuInitializer.init()
            ])
        })
        .catch(function (error) {
            console.error(error);
        });
};



window.onload = function() {
    init().then(setUpRealTime);
}