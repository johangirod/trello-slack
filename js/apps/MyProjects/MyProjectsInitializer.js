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
                return SPM.Models.ChannelManager.createChannel(project);
            })
    })
}

var getNotMyProjectFollowed = function() {
    promises = SPM.Models.ChannelManager
    // 1 - Get project or channel name that I follow
        .getProjectChannelNames()
        .map(function (channelName) {
            return SPM.Models.ProjectManager
                .getProjectByChannelName(channelName)
                .then(function (project) {
                    return project || channelName;
                })
        });
    // 2 - Filter those whose I am member and transforms them to channel
    return Promise.all(promises).then(function (projectOrChannelNames) {
            return projectOrChannelNames
                .filter(function (pocn) {
                    return  (typeof pocn === "string" ) || !SPM.Models.ProjectManager.isMyProject(pocn)
                })
                .map(function (pocn) {
                    return SPM.Models.ChannelManager.createChannel(pocn);
                })
        })
}



var renderChannels = function() {
    Promise.all([
    // 1 - Get channels by category
        Promise.resolve(SPM.Models.ChannelManager.getNotProjectChannels()),    // Other non project Channels
        getNotMyProjectFollowed(),                                          // Project followed, but not member
        getMyProjectsInBoard(SPM.Initializer.boardsIds.seeds),              // My project in seed
        getMyProjectsInBoard(SPM.Initializer.boardsIds.arborium)            // My projects in arborium
    ]).then(function (channel) {
    // 2 - Render the channels
        SPM.ViewHelpers.SectionRenderer.addSection("SPM-other_channe", "AUTRE CHANNELS", channel[0], false);
        SPM.ViewHelpers.SectionRenderer.addSection("SPM-project", "MES PROJETS SUIVIS", channel[1], true);
        SPM.ViewHelpers.SectionRenderer.addSection("SPM-project", "MES GRAINES", channel[2], true);
        SPM.ViewHelpers.SectionRenderer.addSection("SPM-my_project", "MES PROJETS", channel[3], true);
        $("#channel-list").hide();
    })
}

SPM.Apps.MyProjects.MyProjectsInitializer = {
    init: function() {
        return waitUntilChannelsAreHere()
            .then(renderChannels);
    }
}


