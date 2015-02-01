var SPM = SPM || {};

SPM.Initializer = {
    boardsIds: ["IVh8Diai", "l49f2LxM"],

    /**
    * Let's go!
    */
    currentProjectName: null,
    init: function() {
        SPM.TrelloConnector
            .initConnection()
            .then(function() {
                SPM.MemberManager.setMe();
            }.bind(this))
            .then(function() {
                return SPM.BoardManager.init(this.boardsIds);
            }.bind(this))
            .then(function () {
                SPM.Apps.ProjectPanel.PanelInitalizer.init();
                SPM.Apps.MyProjects.MyProjectsInitalizer.init();
                //SPM.Apps.CheckTrelloSlack.CheckTrelloSlackInitializer.init();

            }.bind(this))
            .catch(function (error) {
                console.error(error);
            })
    }
}

window.onload = function() {
    SPM.Initializer.init();
}