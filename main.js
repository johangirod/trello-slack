var TS = TS || {};

TS.Initializer = {
    /**
    * Let's go!
    */
    init: function() {
        TS.ProjectManager.init("l49f2LxM").then(this.searchCurrentProject.bind(this));
    },

    renderCurrentProject: function(project) {
        TS.CurrentProjectRenderer.render(project);
    },

    searchCurrentProject: function() {
        var project = TS.ProjectHelper.getProjectNameFromUrl(document.URL);
        TS.ProjectManager.searchProject(project).then(function(project) {
            this.renderCurrentProject(project);
        }.bind(this)).catch(function(msg) {
            alert(msg);
        });
    }
}

window.onload = function() {
    TS.Initializer.init();
}