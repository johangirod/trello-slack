var TS = TS || {};

var numberOfProjects = 0;

var waitUntilChannelsAreHere = function() {
    return TS.Utils.waitUntil(function() {
        return numberOfProjects != $("#channel-list li").length;
    });
};

var projectNames = [];
var dataChannelIds = [];
var setProjectNames = function() {
    projectNames = $.map($("#channel-list li .overflow-ellipsis"), function(li, index) {
        return $(li).text().replace(/(\r\n|\n|\r|\s+)/gm,"").slice(1);
    });
    dataChannelIds = $.map($("#channel-list a.channel_name"), function(a, index) {
        return $(a).attr("data-channel-id");
    });
};
var myProjects = [];
var projects = [];
var setProjects = function() {
    TS.MemberManager.setMe().then(function(me) {
        return Promise
        // 1- Getting all the projects
        .all(projectNames.map(function(projectName) {
            return new Promise(function(sucess, error) {
                TS.BoardManager.findProject(projectName)
                .then(function(project) {
                    project.slack = projectName;
                    project.slackId = dataChannelIds[_.indexOf(projectNames, projectName)];
                    projects.push(project);
                    sucess(project);
                }.bind(this))
                .catch(function() {
                    sucess();
                }.bind(this));
            }.bind(this));
        }.bind(this)))
        // 2 - Gettin' all the members all the projects
        .then(function (projects) {
            myProjects = _.filter(projects, function(project){
                if (typeof project != 'undefined') {
                    return _.find(project.members, function(member) {
                        return TS.MemberManager.me.id == member.id;
                    })
                } else {
                    return false;
                }
            });
            TS.ProjectsListRenderer.render(myProjects);
        })
        .catch(function() {
            console.log('hello');
        })
    });
}

TS.ProjectsListInitalizer = {
    init: function() {
        TS.CodeInjector.injectFile("js/projectsListInjectedCode.js");
        waitUntilChannelsAreHere()
            .then(setProjectNames)
            .then(setProjects);
    }
}
