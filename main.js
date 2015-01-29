var TS = TS || {};

TS.Initializer = {
    boardsIds: ["IVh8Diai", "l49f2LxM"],
    /**
    * Let's go!
    */
    init: function() {
        TS.CodeInjector.injectFile("js/injectedCode.js");

        TS.ProjectManager.init(this.boardsIds).then(function() {
            this.checkChange();
        }.bind(this))

    },

    renderCurrentProject: function(project) {
        TS.CurrentProjectRenderer.setBoards(TS.ProjectManager.boardsWithProjects);
        TS.CurrentProjectRenderer.render(project);
    },

    currentProject: null,

    searchCurrentProject: function() {
        var project = TS.ProjectHelper.getProjectNameFromUrl(document.URL);
        if (this.currentProject !== project) {
            TS.CurrentProjectRenderer.reset();
            this.currentProject = project;
            if (this.currentProject !== null) {
                TS.ProjectManager.searchProject(this.currentProject).then(function(project) {
                    this.renderCurrentProject(project);
                }.bind(this)).catch(function(msg) {
                    TS.CurrentProjectRenderer.renderNoProject();
                });
            } else {
                TS.CurrentProjectRenderer.reset();
            }

        }
    },
    timerId: null,

    checkChange: function(callback) {
        // Very beautiful way to know if the layout has been changed
        this.searchCurrentProject();
        this.timerId = setInterval(function() {
            this.searchCurrentProject();
        }.bind(this), 100);
    }
}

window.onload = function() {
    TS.Initializer.init();
}