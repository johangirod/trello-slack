var TS = TS || {};
TS.CurrentProjectRenderer = {
    width: null,
    project: null,
    render: function(project) {

        // Initialize events
        if (!this.evenInitialized) {
            this.initEvents();
        };

        this.reset();
        this.project = project;
        // wait since the panel is here :(
        this.renderLoop(function() {
            this.addDiv();
            this.addTitle();
        }.bind(this));
    },
    evenInitialized: false,
    initEvents: function() {
        this.evenInitialized = true;
    },

    reset: function() {
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
            var membersView = TS.MembersRenderer.render(this.project.members);
            if (this.project.board) { var boardName = this.project.board.name; } else {
                var boardName = "";
            }
            var desc = markdown.toHTML(this.project.desc);
            var div = '\
            <div class="tab-pane active" id="projects_tab">\
                <div id="file_list_container">\
                    <div class="heading">\
                        <a id="file_list_heading" class="menu_heading">\
                            <span class="heading_label">' + this.project.name + '</span> \
                        </a>\
                    </div>\
                    <div class="toolbar">\
                        <div class="TS-board_name">' + boardName + '</div>\
                        <div id="file_list_toggle" class="btn-group">\
                            <button id="file_list_toggle_all" class="file_list_toggle active btn btn-mini btn-outline">Everyone</button>\
                            <button id="file_list_toggle_user" class="file_list_toggle btn btn-mini btn-outline">Just You</button>\
                            <button id="file_list_toggle_users" class="file_list_toggle btn btn-mini btn-outline">test</button>\
                        </div>\
                    </div>\
                    <div class="TS-tab-content">\
                        <div class="TS-members">' + membersView + '</div>\
                        <a href="' + this.project.url + '" target="_blank" id="file_listing_bottom_button" class="bottom_margin btn full_width">\
                            See this project on Trello...\
                        </a>\
                        <div class="subsection" data-filter="all">\
                            <p>' + desc + '</p>\
                        </div>\
                    </div>\
                </div>\
            </div>';
            this.div = $(div).appendTo("#flex_contents");
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
