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
            .then(TS.BoardManager.init(this.boardsIds))
            .then(TS.CurrentProjectRenderer.setBoards)
            .then(this.checkChange)
    },

    renderCurrentProject: function() {
        TS.BoardManager.getProject(projectName).then(
            TS.CurrentProjectRenderer.render, 
            TS.CurrentProjectRenderer.renderNoProject
        );
    },
    projectHasChanged: function () {
        var projectName = TS.Utils.getProjectNameFromUrl(document.URL);
        return this.currentProjectName !== projectName
    },
    checkChange: function(callback) {
        console.log("hoho")
        // Very beautiful way to know if the layout has been changed
        return TS.Utils.waitUntil(this.projectHasChanged).then(function () {
        console.log("jf")

            this.currentProjectName = TS.Utils.getProjectNameFromUrl(document.URL);
            this.renderCurrentProject();
            return this.checkChange();
        }.bind(this))
    }
}

window.onload = function() {
    TS.Initializer.init();
}