var TS = TS || {};

TS.Initializer = {
    boardsIds: ["IVh8Diai", "l49f2LxM"],

    /**
    * Let's go!
    */
    currentProjectName: null,
    init: function() {
        TS.TrelloManager
            .initConnection()
            .then(function() {
                return TS.BoardManager.init(this.boardsIds)
            }.bind(this))
            .then(function () {
                TS.CurrentProjectRenderer.setBoards(TS.BoardManager.boards);
                TS.PanelInitalizer.init();
                TS.ProjectsListInitalizer.init();
            }.bind(this))
            .catch(function (error) {
                console.error(error);
            })
    }
}

window.onload = function() {
    TS.Initializer.init();
}