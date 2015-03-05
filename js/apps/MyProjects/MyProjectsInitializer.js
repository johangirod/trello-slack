var Utils           = require('SPM/Utils/Utils');
var ChannelManager  = require('SPM/Model/ChannelManager');
var ProjectManager  = require('SPM/Model/Project/ProjectManager');
var SectionRenderer = require('SPM/ViewHelpers/MenuSectionViewHelper/MenuSectionRenderer');

var numberOfProjects = 0;

var waitUntilChannelsAreHere = function() {
    return Utils.waitUntil(function() {
        return numberOfProjects != $("#channel-list li").length;
    });
};

var getMyProjectsInBoard = function(boardId) {
    return ProjectManager.getMyProjects().then(function (projects) {
        return projects
            .filter(function (project) {
                return project.idBoard == boardId;
            })
            .map(function (project) {
                return ChannelManager.createChannel(project);
            });
    });
};

var getNotMyProjectFollowed = function() {
    promises = ChannelManager
    // 1 - Get project or channel name that I follow
        .getProjectChannelNames()
        .map(function (channelName) {
            return ProjectManager
                .getProjectByChannelName(channelName)
                .then(function (project) {
                    return project || channelName;
                });
        });
    // 2 - Filter those whose I am member and transforms them to channel
    return Promise.all(promises).then(function (projectOrChannelNames) {
            return projectOrChannelNames
                .filter(function (pocn) {
                    return  (typeof pocn === "string" ) || !ProjectManager.isMyProject(pocn)
                })
                .map(function (pocn) {
                    return ChannelManager.createChannel(pocn);
                });
        });
};

var _boardsIds = [];

var renderChannels = function() {
    Promise.all([
    // 1 - Get channels by category
        Promise.resolve(ChannelManager.getNotProjectChannels()),    // Other non project Channels
        getNotMyProjectFollowed(),                                  // Project followed, but not member
        getMyProjectsInBoard(_boardsIds.seeds),                     // My project in seed
        getMyProjectsInBoard(_boardsIds.arborium)                   // My projects in arborium
    ]).then(function (channel) {
        var myProjectsDone = _.partition(channel[3], function(channel) {
            return ["54b949c70a8cc363f4cbdf74", "54b949ca8aa6d6fba4c87700"].indexOf(channel.project.idList) == -1;
        });
    // 2 - Render the channels
        SectionRenderer.addSection("SPM-other_channe", "AUTRE CHANNELS", channel[0], false);
        SectionRenderer.addSection("SPM-project-followed", "MES PROJETS SUIVIS", channel[1], true);
        SectionRenderer.addSection("SPM-my_project_done", "MES PROJETS FINIS", myProjectsDone[0], true);
        SectionRenderer.addSection("SPM-project", "MES GRAINES", channel[2], true);
        SectionRenderer.addSection("SPM-my_project", "MES PROJETS", myProjectsDone[1], true);
        $("#channel-list").hide();
    });
};

module.exports = {
    init: function() {
        return waitUntilChannelsAreHere()
            .then(renderChannels);
    },

    updateProject: function(project) {
        renderChannels();
    },

    setBoardIds: function(boardIds) {
        _boardsIds = boardIds;
    },

    reload: function () {
        SectionRenderer.flush();
        renderChannels();
    }
};


