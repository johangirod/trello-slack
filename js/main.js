var TrelloConnector       = require('SPM/connector/TrelloConnector');
var MemberManager         = require('SPM/Model/MemberManager');
var ProjectManager        = require('SPM/Model/Project/ProjectManager');
var ProjectStorage        = require('SPM/Model/Project/ProjectStorage');
var TrelloProjectReader   = require('SPM/Model/Project/TrelloProjectReader');
var PanelRenderer         = require('SPM/apps/ProjectPanel/views/PanelRenderer');
var PanelInitalizer       = require('SPM/apps/ProjectPanel/PanelInitializer');
var MyProjectsInitializer = require('SPM/apps/MyProjects/MyProjectsInitializer');
var ToggleMenuInitializer = require('SPM/apps/ToggleMenu/ToggleMenuInitializer');


var _boardsIds = {
    arborium: "54b94910f186c08595048a8f",
    seeds: "54b7c3955fdb8e63ba5819d8"
}

var _buildModel = function() {

    ProjectManager.addStorage(ProjectStorage);
    ProjectManager.addStorage(TrelloProjectReader);

    return TrelloProjectReader.setBoards(_boardsIds);
};

var init = {

    /**
    * Let's go!
    */
    currentProjectName: null,
    date: moment(),
    init: function() {
        TrelloConnector
            .initConnection()
            .then(function() {
                return MemberManager.setMe();
            }.bind(this))
            .then(function() {

                return _buildModel.apply(this);
            })
            .then(function() {
                PanelRenderer.setBoards(TrelloProjectReader.getBoards());
                PanelInitalizer.init();
                MyProjectsInitializer.setBoardIds(_boardsIds);
                MyProjectsInitializer.init();
                ToggleMenuInitializer.init();

            }.bind(this))
            .catch(function (error) {
                console.error(error);
            })

        var myFirebaseRef = new Firebase("https://trello.firebaseio.com/");
        myFirebaseRef.child("projects")
        .on("child_added", function(snapshot) {
            this.update(snapshot.val().id, snapshot.val().updated_at);
        }.bind(this));
        myFirebaseRef.child("projects")
        .on("child_changed", function(snapshot) {
            this.update(snapshot.val().id, snapshot.val().updated_at);
        }.bind(this));
    },
    update: function(id, date) {
        if (this.date.isBefore(moment(date))) {
            ProjectManager.updateProjectById(id).then(function(project) {
                PanelInitalizer.updateProject(project);
                MyProjectsInitializer.updateProject(project);
            })
        } else {
            return false;
        }
    }
}

window.onload = function() {
    debugger;
    init.init();
}