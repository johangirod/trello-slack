var TS = TS || {};

TS.Initializer = {
    /**
    * Let's go!
    */
    init: function() {
        TS.ProjectManager.init(["l49f2LxM", "IVh8Diai"]).then(function() {
            this.checkChange();
        }.bind(this))

        this.searchCurrentProject();
    },

    renderCurrentProject: function(project) {
        TS.CurrentProjectRenderer.render(project);
    },

    currentProject: null,

    searchCurrentProject: function() {
        var project = TS.ProjectHelper.getProjectNameFromUrl(document.URL);
        if (this.currentProject !== project) {
            this.currentProject = project;
            TS.ProjectManager.searchProject(this.currentProject).then(function(project) {
                this.renderCurrentProject(project);
            }.bind(this)).catch(function(msg) {
                alert(msg);
            });
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