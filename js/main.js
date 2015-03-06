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
            ProjectManager.setBoardsIds(BOARD_IDS);
            MyProjectsInitializer.setBoardIds(BOARD_IDS);
            PanelInitializer.init();
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