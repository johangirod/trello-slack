var SPM = SPM || {};
SPM.Apps = SPM.Apps || {};
SPM.Apps.MyProjects = SPM.Apps.MyProjects || {};


var numberOfProjects = 0;

var waitUntilChannelsAreHere = function() {
    return SPM.Utils.waitUntil(function() {
        return numberOfProjects != $("#channel-list li").length;
    });
};

var getMyProjectsInBoard = function(boardId) {
    return SPM.Models.ProjectManager.getMyProjects().then(function (projects) {
        return projects
            .filter(function (project) {
                return project.idBoard == boardId;
            })
            .map(function (project) {
                return project.slack || project.name
            })
    })
}

var getNotMyProjectFollowed = function() {
    promises = SPM.Models.ChannelManager
        .getProjectChannelNames()
        .map(function (channelName) {
            return SPM.Models.ProjectManager
                .getProjectByChannelName(channelName)
                .then(function (project) {
                    return project || channelName;
                })
        });
    return Promise.all(promises).then(function (projectOrChannelNames) {
            return projectOrChannelNames
                .filter(function (pocn) {
                    return  (typeof pocn === "string" ) || SPM.Models.ProjectManager.isMyProject(pocn)
                })
                .map(function (pocn) {
                    return pocn.slack || pocn;
                })
        })
}



var renderChannels = function() {


    Promise.all([
    // 1 - Get channel names by category
        Promise.resolve(SPM.Models.ChannelManager.getNotProjectChannelNames()),    // Other non project Channels
        getNotMyProjectFollowed(),                                          // Project followed, but not member
        getMyProjectsInBoard(SPM.Initializer.boardsIds.seeds),              // My project in seed
        getMyProjectsInBoard(SPM.Initializer.boardsIds.arborium)            // My projects in arborium
    ]
    // 2 - get channels objects 
        .map(function(chanelNamesPromise) {
            return SPM.Models.ChannelManager.getChannelsFromPromise(chanelNamesPromise);
        })
    ).then(function (channel) {
    // 3 - Render the channels
        SPM.ViewHelpers.SectionRenderer.addSection("SPM-other_channe", "AUTRE CHANNELS", channel[0], false);
        SPM.ViewHelpers.SectionRenderer.addSection("SPM-project", "MES PROJETS SUIVIS", channel[1], true);
        SPM.ViewHelpers.SectionRenderer.addSection("SPM-project", "MES GRAINES", channel[2], true);
        SPM.ViewHelpers.SectionRenderer.addSection("SPM-my_project", "MES PROJETS", channel[3], true);
        $("#channel-list").hide();
    })
}

SPM.Apps.MyProjects.MyProjectsInitalizer = {
    init: function() {
        return waitUntilChannelsAreHere()
            .then(renderChannels);
    }
}
