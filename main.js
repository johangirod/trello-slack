var TS = TS || {};

TS.Initializer = {
    boardsIds: ["IVh8Diai", "l49f2LxM"],

    /**
    * Let's go!
    */
    currentProjectName: null,
    init: function() {
        TS.CodeInjector.injectFile("js/injectedCode.js");
        TS.TrelloManager
            .initConnection()
            .then(function() {
                return TS.BoardManager.init(this.boardsIds)
            }.bind(this))
            .then(function () {
                TS.CurrentProjectRenderer.setBoards(TS.BoardManager.boards);
                return this.checkChange();
            }.bind(this))
            .catch(function (error) {
                console.error(error);
            })
    },

    renderCurrentProject: function() {
        return TS.BoardManager.getProject(this.currentProjectName).then(
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
        // Very beautiful way to know if the layout has been changed
        return TS.Utils
            .waitUntil(this.projectHasChanged.bind(this))
            .then(function () {
                console.log("CHANGED")
                this.currentProjectName = TS.Utils.getProjectNameFromUrl(document.URL);
                this.renderCurrentProject()
                return this.checkChange();
            }.bind(this))
    }
}

window.onload = function() {
    TS.Initializer.init();
}