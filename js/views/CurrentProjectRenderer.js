var TS = TS || {};
TS.CurrentProjectRenderer = {

    template: null,
    initTemplate: function() {
        if (this.template === null) {
            this.template = new EJS({url: chrome.extension.getURL('js/views/project.ejs')});
        }
    },

    // array of selectable boards
    boards: null,
    setBoards: function(boards) {
        this.boards = boards;
    },

    width: null,
    project: null,
    render: function(project) {
        this.initTemplate();
        this.initEvents();

        this.reset();
        this.project = project;
        // wait since the panel is here :(
        if (this.project !== null) {
            this.renderLoop(function() {
                this.addDiv();
                if (this.project !== null) {
                    this.addTitle(this.project.name);
                }
                if (this.error !== '') {
                    this.addErrorTitle(this.error);
                }
            }.bind(this));
        }
    },

    renderNoProject: function() {
        this.addErrorTitle("Pas de carte sur trello ;(");
    },

    evenInitialized: false,
    initEvents: function() {
        if (!this.evenInitialized) {
            this.evenInitialized = true;
        }
    },

    reset: function() {
        console.log('reset');
        this.project = null;
        // remove div
        if (this.div !== null) {
            this.div.remove();
        }
        // remove title
        if (this.titleDiv !== null) {
            this.titleDiv.remove();
        }

        this.error = '';

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
        if (this.project !== null && $("#projects_tab").length == 0) {
            var div = '<div class="tab-pane active" id="projects_tab"></div>';
            this.div = $(div).appendTo("#flex_contents");
            this.template.update("projects_tab", {
                project: this.project,
                boards: this.boards
            });
        }
    },

    timerId: null,

    renderLoop: function(callback) {
        // Very beautiful way to know if the layout has been changed
        if (this.timerId !== null) {
            clearInterval(this.timerId);
        }
        this.timerId = setInterval(function() {
            callback();
        }.bind(this), 100);
    },

    titleDiv: null,
    addTitle: function(title) {
        if ($(".TS-title").length == 0) {
            var dom = '<span class="name TS-title">' + title + '</span>';
            this.titleDiv = $(dom).appendTo("#active_channel_name");
        }

    },
    error: '',
    addErrorTitle: function(message) {
        this.error = message;
        if ($(".TS-title").length == 0) {
            var dom = '<span class="name TS-title error">' + message + '</span>';
            this.titleDiv = $(dom).appendTo("#active_channel_name");
        }
    }
}
