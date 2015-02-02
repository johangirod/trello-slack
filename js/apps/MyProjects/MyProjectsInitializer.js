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
    SPM.ProjectManager.getNotMyProjectsChannels()
    .then(function (projects) {
        SPM.ViewHelpers.SectionRenderer.addSection("SPM-project", "LES PROJETS QUE JE SUIS", projects, false);
    })
    .catch(function() {
        console.error('error setting projects');
    });
    SPM.ProjectManager.getMyProjectsInArborium()
    .then(function (projects) {
        SPM.ViewHelpers.SectionRenderer.addSection("SPM-my_project", "MES PROJETS", projects, true);
    })
    .catch(function() {
        console.error('error setting my projects');
    });
}

SPM.Apps.MyProjects.MyProjectsInitalizer = {
    init: function() {
        return waitUntilChannelsAreHere()
            .then(setProjects);
    }
}
