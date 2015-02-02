var SPM = SPM || {};

SPM.Initializer = {
    boardsIds: ["IVh8Diai", "l49f2LxM"],

    /**
    * Let's go!
    */
    currentProjectName: null,
    init: function() {
        this.initDate();
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
    },
    initDate: function() {

        moment.locale("fr");
        moment.locale('fr', {
            relativeTime : {
                future: "%s",
                past:   "/!\\ date passée!",
                s:  "J",
                m:  "J",
                mm: "J",
                h:  "J",
                hh: "J",
                d:  "J-1",
                dd: "J-%d",
                M:  "M-1",
                MM: "M-%d",
                y:  "Y-1",
                yy: "Y-%d"
            }
        });
    }
}

window.onload = function() {
    SPM.Initializer.init();
}