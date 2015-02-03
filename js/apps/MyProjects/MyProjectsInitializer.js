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
    return this.getMyProject().then(function (projects) {
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
        console.log("2")
    return Promise.all(SPM.Models.ChannelManager.getProjectChannelNames()
            .map(function (channelName) {
                console.log("2.1", channelName)
                return SPM.Models.ProjectManager
                    .getProjectByChannelName(channelName)
                    .then(function (project) {
                        console.log("2.2", project)
                        return project || channelName;
                    })
            })
        )
        .then(function (projectOrChannelNames) {
            return projectOrChannelNames
                .filter(function (pocn) {
                    return  (typeof pocn === "string" ) || SPM.Models.ProjectManager.isMyProject(pocn)
                })
                .map(function (pocn) {
                    console.log("2ok")

                    return pocn.slack || pocn;

                })
        })
}

var renderChannels = function() {
    console.log("0")

    Promise.all([
    // 1 - Get channel names by category
        Promise.resolve(SPM.Models.ChannelManager.getNotProjectChannelNames()),    // Other non project Channels
        getNotMyProjectFollowed(),                                          // Project followed, but not member
        getMyProjectsInBoard(SPM.Initializer.boardsIds.seeds),              // My project in seed
        getMyProjectsInBoard(SPM.Initializer.boardsIds.arborium)            // My projects in arborium
    ].map(function(channelNamePromise) {
    // 2 - Get the associated channel object 
        console.log("yriz")
        return channelNamePromise.then(SPM.Models.ChannelManager.getChannel);
    })).then(function (channel) {
    // 3 - Render the channels
        SPM.ViewHelpers.SectionRenderer.addSection("SPM-other_channe", "AUTRE CHANNELS", channel[0]);
        SPM.ViewHelpers.SectionRenderer.addSection("SPM-project", "MES PROJETS SUIVIS", channel[1]);
        SPM.ViewHelpers.SectionRenderer.addSection("SPM-project", "MES GRAINES", channel[2]);
        SPM.ViewHelpers.SectionRenderer.addSection("SPM-my_project", "MES PROJETS", channel[3]);
        $("#channel-list").hide();
    })
    .catch(function(err) {
        console.error(err)
    });
}

SPM.Apps.MyProjects.MyProjectsInitalizer = {
    init: function() {
        return waitUntilChannelsAreHere()
            .then(renderChannels);
    }
}
