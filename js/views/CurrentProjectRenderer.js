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
                this.addTitle();
            }.bind(this));
        }
    },

    evenInitialized: false,
    initEvents: function() {
        if (!this.evenInitialized) {
            this.evenInitialized = true;
        }
    },

    reset: function() {
        console.log('reset');
        // remove div
        if (this.div !== null) {
            this.div.remove();
        }
        // remove title
        if (this.titleDiv !== null) {
            this.titleDiv.remove();
        }

    },

    div: null,
    addDiv: function() {
        // Create the div if not here
        if ($("#projects_tab").length == 0) {

            var div = '<div class="tab-pane active" id="projects_tab"></div>';
            this.div = $(div).appendTo("#flex_contents");
            this.template.update("projects_tab", {
                project: this.project,
                boards: this.boards,
                members: this.project.members
            });
        }
    },

    timerId: null,

    renderLoop: function(callback) {
        // Very beautiful way to know if the layout has been changed
        this.timerId = setInterval(function() {
            callback();
        }.bind(this), 100);
    },

    titleDiv: null,
    addTitle: function() {
        if ($(".TS-title").length == 0) {
            var dom = '<span class="name TS-title">' + this.project.name + '</span>';
            this.titleDiv = $(dom).appendTo("#active_channel_name");
        }

    }
}
