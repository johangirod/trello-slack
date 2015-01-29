var TS = TS || {};

/*
    PRIVATE FUNCTIONS
*/

var panelIsHere = function () {
    return $("#flex_contents").length
}
var titleIsHere = function () {
    return $("#active_channel_name").length
}


TS.CurrentProjectRenderer = {

    template: null,
    initTemplate: function() {
        if (this.template === null) {
            this.template = new EJS({url: chrome.extension.getURL('js/views/project.ejs')});
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
        
        TS.Utils
            .waitUntil(titleIsHere)
            .then(function () {
                this.addTitle(this.getDueDate() + ' ' + this.project.name);
            }.bind(this))

        TS.Utils
            .waitUntil(panelIsHere)
            .then(function () {
                this.addDiv();
            }.bind(this))
    },

    renderNoProject: function() {
        this.addErrorTitle("Pas de carte sur trello ;(");
    },

    reset: function() {
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
        TS.CodeInjector.injectCode('\
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
        var dom = '<span class="name TS-title">' + title + '</span>';
        this.titleDiv = $(dom).appendTo("#active_channel_name");
    },
    error: '',
    addErrorTitle: function(message) {
        this.error = message;
        var dom = '<span class="name TS-title error">' + message + '</span>';
        this.titleDiv = $(dom).appendTo("#active_channel_name");
    },

    getDueDate: function() {
        if (this.project && this.project.due) {
            var due = this.project.due;
            return due.substring(8, 10) + '/' + due.substring(5, 7) + '/' + due.substring(0, 4)
        } else {
            return '';
        }
    }
}
