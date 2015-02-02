var SPM = SPM || {};
SPM.Apps = SPM.Apps || {};
SPM.Apps.ProjectPanel = SPM.Apps.ProjectPanel || {};

SPM.Apps.ProjectPanel.PanelInitalizer = {
    init: function() {
        SPM.CodeInjector.injectFile("js/apps/ProjectPanel/panelInjectedCode.js");
        return this.checkChange();
    },

    renderCurrentProject: function() {
        return SPM.ProjectManager.findProject(this.currentProjectName).then(
            function success (project) {
                console.log(project);
                SPM.PanelRenderer.render(project);
            },
            function error (err) {
                SPM.PanelRenderer.renderNoProject();
                console.warn(err);
            }
        );
    },

    projectHasChanged: function () {
        var projectName = SPM.Utils.getProjectNameFromUrl(document.URL);
        return this.currentProjectName !== projectName
    },

    checkChange: function(callback) {
        // Very beautiful way to know if the layout has been changed
        return SPM.Utils
            .waitUntil(this.projectHasChanged.bind(this))
            .then(function () {
                this.currentProjectName = SPM.Utils.getProjectNameFromUrl(document.URL);
                if (this.currentProjectName) {
                   this.renderCurrentProject();
                } else {
                    SPM.PanelRenderer.reset();
                    SPM.PanelRenderer.closePanel();
                }
                return this.checkChange();
            }.bind(this));
    }
}