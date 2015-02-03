var SPM = SPM || {};
        console.log("-6")

SPM.Initializer = {
    boardsIds: {
        arborium: "IVh8Diai",
        seeds: "l49f2LxM"
    },

    /**
    * Let's go!
    */
    currentProjectName: null,
    init: function() {
        this.initDate();
        SPM.TrelloConnector
            .initConnection()
            .then(function() {
                return SPM.Models.MemberManager.setMe();
            }.bind(this))
            .then(function() {
                return SPM.Models.BoardManager.init(this.boardsIds);
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
                past:   "%s",
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