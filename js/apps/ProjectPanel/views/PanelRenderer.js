var SPM = SPM || {};

/*
    PRIVATE FUNCTIONS
*/

var panelIsHere = function () {
    return $("#flex_contents").length
}
var titleIsHere = function () {
    return $("#active_channel_name").length
}

SPM.PanelRenderer = {

    template: null,
    initTemplate: function() {
        if (this.template === null) {
            this.template = new EJS({url: chrome.extension.getURL('js/apps/ProjectPanel/views/panel.ejs')});
        }
    },

    boards: null,
    project: null,

    setBoards: function(boards) {
        this.boards = boards;
        return this;
    },

    render: function(project) {
        this.initTemplate();
        this.reset();

        this.project = project;

        SPM.Utils
            .waitUntil(titleIsHere)
            .then(function () {
                this.addTitle(this.getDueDate() + ': ' + this.project.name);
            }.bind(this))

        SPM.Utils
            .waitUntil(panelIsHere)
            .then(function () {
                this.addDiv();
            }.bind(this))
    },

    renderNoProject: function() {
        this.addErrorTitle("Pas de carte sur trello ;(");
    },

    reset: function() {
        console.log('reset, yo');

        this.project = null;
        // remove div
        if (this.div !== null) {
            this.div.remove();
        }
        // remove title
        if (this.titleDiv !== null) {
            this.titleDiv.remove();
        }

        // close panel
        SPM.CodeInjector.injectCode('\
        if ($(".flex_pane_showing #flex_toggle").length != 0) {\
            $("#flex_toggle").trigger("click");\
        }\
        ');

    },

    div: null,
    addDiv: function() {
        // Create the div if not here
        var div = '<div class="tab-pane active" id="projects_tab"></div>';
        this.div = $(div).appendTo("#flex_contents");

        console.log("yo")
        console.log(this.boards, this.project)
        this.template.update("projects_tab", {
            project: this.project,
            boards: this.boards
        });
        console.log("yeia")
    },

    titleDiv: null,
    addTitle: function(title) {
        var dom = '<span class="name SPM-title">' + title + '</span>';
        this.titleDiv = $(dom).appendTo("#active_channel_name");
    },
    error: '',
    addErrorTitle: function(message) {
        this.error = message;
        var dom = '<span class="name SPM-title error">' + message + '</span>';
        this.titleDiv = $(dom).appendTo("#active_channel_name");
    },

    getDueDate: function() {
        if (this.project && this.project.due) {
            var due = this.project.due;
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
            return moment(due).fromNow();
        } else {
            return '?/?/?';
        }
    }
}
