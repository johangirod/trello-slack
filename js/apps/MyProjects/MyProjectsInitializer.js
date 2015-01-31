var SPM = SPM || {};
SPM.Apps = SPM.Apps || {};
SPM.Apps.MyProjects = SPM.Apps.MyProjects || {};


var numberOfProjects = 0;

var waitUntilChannelsAreHere = function() {
    return SPM.Utils.waitUntil(function() {
        return numberOfProjects != $("#channel-list li").length;
    });
};

var dataChannelIds = [];
var setProjectNames = function() {
    projectNames = SPM.Models.ChannelManager.getChannelNames();
    dataChannelIds = SPM.Models.ChannelManager.getChannelIds();
};
var myProjects = [];
var projects = [];
var setProjects = function() {
    return SPM.ProjectManager.findMyProjects()
    .then(function (projects) {
        SPM.Apps.MyProjects.Views.MyProjectsRenderer.render(projects);
    })
    .catch(function() {
        console.log('hello');
    });
}

SPM.Apps.MyProjects.MyProjectsInitalizer = {
    init: function() {
        SPM.PanelRenderer.setBoards(SPM.BoardManager.boards);
        SPM.CodeInjector.injectFile("js/apps/MyProjects/MyProjectsInjectedCode.js");
        waitUntilChannelsAreHere()
            .then(setProjectNames)
            .then(setProjects);
    }
}
