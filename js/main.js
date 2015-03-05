var TrelloConnector       = require('SPM/connector/TrelloConnector');
var MemberManager         = require('SPM/Model/MemberManager');
var ProjectManager        = require('SPM/Model/Project/ProjectManager');
var PanelRenderer         = require('SPM/apps/ProjectPanel/views/PanelRenderer');
var PanelInitializer      = require('SPM/apps/ProjectPanel/PanelInitializer');
var MyProjectsInitializer = require('SPM/apps/MyProjects/MyProjectsInitializer');
var ToggleMenuInitializer = require('SPM/apps/ToggleMenu/ToggleMenuInitializer');
var TrelloProjectReader   = require('SPM/Model/Project/TrelloProjectReader');


var BOARD_IDS = {
    arborium: "54b94910f186c08595048a8f",
    seeds: "54b7c3955fdb8e63ba5819d8"
};


var initDate = moment();

var updateView = function(snapshot) {
    var id = snapshot.val().id;
    var date = snapshot.val().updated_at;
    if (initDate.isBefore(moment(date))) {
        ProjectManager
            ._flushById(id)
            .then(function() {
                PanelInitializer.reload();
                MyProjectsInitializer.reload();
            });
    }
};

var setUpRealTime = function () {
    new Firebase("https://trello.firebaseio.com/").child("projects")
        .on("child_added", updateView)
        .on("child_changed", updateView);
};

var init = function() {
    TrelloConnector
        .initConnection()
        .then(function() {
            return MemberManager.setMe();
        }.bind(this))
        .then(function() {
            return TrelloProjectReader.setBoards(BOARD_IDS);
        })
        .then(function() {
            PanelRenderer.setBoards(TrelloProjectReader.getBoards());
            PanelInitializer.init();
            MyProjectsInitializer.setBoardIds(BOARD_IDS);
            MyProjectsInitializer.init();
            ToggleMenuInitializer.init();
        }.bind(this))
        .catch(function (error) {
            console.error(error);
        });
};



window.onload = function() {
    // debugger;
    init();
}