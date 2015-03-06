var CodeInjector   = require('../../Utils/CodeInjector.js');
var UrlChanged     = require('../../Utils/UrlChanged.js');
var Utils          = require('../../Utils/Utils.js');
var ProjectManager = require('../../Model/Project/ProjectManager.js');
var PanelRenderer  = require('../../apps/ProjectPanel/views/PanelRenderer.js');

module.exports = {
    init: function() {
        CodeInjector.injectFile("js/apps/ProjectPanel/panelInjectedCode.js");

        UrlChanged.onChanged(function() {
            this.onChanged();
        }.bind(this));
        this.onChanged();
        return true;
    },

    renderCurrentProject: function() {
        return ProjectManager
            .getProjectByChannelName(this.currentProjectName)
            .then(function(project) {
                return (project)?
                    PanelRenderer.render(project):
                    PanelRenderer.renderNoProject();
            });
    },

    onChanged: function(force) {

        var projectName = Utils.getProjectNameFromUrl(document.URL);
        if (force || this.currentProjectName !== projectName) {
            this.currentProjectName = projectName;
            if (this.currentProjectName) {
               this.renderCurrentProject();
            } else {
                PanelRenderer.reset();
                PanelRenderer.closePanel();
            }
        }

    },

    updateProject: function(project) {
        this.onChanged(true);
    }
};