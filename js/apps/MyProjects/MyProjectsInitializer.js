var SPM = SPM || {};
SPM.Apps = SPM.Apps || {};
SPM.Apps.MyProjects = SPM.Apps.MyProjects || {};


var numberOfProjects = 0;

var waitUntilChannelsAreHere = function() {
    return SPM.Utils.waitUntil(function() {
        return numberOfProjects != $("#channel-list li").length;
    });
};

var setProjects = function() {
    Promise.all([
        SPM.ProjectManager.getNotMyProjectsChannels(),
        SPM.ProjectManager.getMyProjectsInBoard(SPM.Initializer.boardsIds.arborium),
        SPM.ProjectManager.getNotProjectsChannels(),
        SPM.ProjectManager.getMyProjectsInBoard(SPM.Initializer.boardsIds.seeds)
    ]).then(function(results) {
        SPM.ViewHelpers.SectionRenderer.addSection("SPM-other_channe", "AUTRE CHANNELS", results[2]);
        SPM.ViewHelpers.SectionRenderer.addSection("SPM-project", "LES PROJETS QUE JE SUIS", results[0]);
        SPM.ViewHelpers.SectionRenderer.addSection("SPM-project", "MES GRAINES", results[3]);
        SPM.ViewHelpers.SectionRenderer.addSection("SPM-my_project", "MES PROJETS", results[1]);
        $("#channels").hide();
    })
    .catch(function() {
        console.error('error setting projects');
    });
}

SPM.Apps.MyProjects.MyProjectsInitalizer = {
    init: function() {
        return waitUntilChannelsAreHere()
            .then(setProjects);
    }
}
