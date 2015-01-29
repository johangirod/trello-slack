var TS = TS || {};

TS.PanelInitalizer = {
    init: function() {
        TS.CodeInjector.injectFile("js/injectedCode.js");
        return this.checkChange();
    },

    renderCurrentProject: function() {
        return TS.BoardManager.findProject(this.currentProjectName).then(
            function success (project) {
                TS.CurrentProjectRenderer.render(project)
            },
            function error (error) {
                TS.CurrentProjectRenderer.renderNoProject();
                console.warn(error)
            }
        );
    },

    projectHasChanged: function () {
        var projectName = TS.Utils.getProjectNameFromUrl(document.URL);
        return this.currentProjectName !== projectName
    },

    checkChange: function(callback) {
        console.log("hoho")
        // Very beautiful way to know if the layout has been changed
        return TS.Utils
            .waitUntil(this.projectHasChanged.bind(this))
            .then(function () {
                this.currentProjectName = TS.Utils.getProjectNameFromUrl(document.URL);
                this.renderCurrentProject()
                return this.checkChange();
            }.bind(this))
    }
}