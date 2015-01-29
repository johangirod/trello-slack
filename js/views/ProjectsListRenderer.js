var TS = TS || {};

TS.ProjectsListRenderer = {
    render: function(projects) {
        this.projects = projects;
        this.initTemplate();
        this.addDiv();
    },


    addDiv: function() {
        var div = '<div id="TS-my_project" class="section_holder"></div>';
        if ($("#starred_div").length > 0) {
            $("#starred_div").after(div);
        } else {
            $("#channels_scroller").prepend(div);
        }

        this.template.update("TS-my_project", {
            projects: this.projects
        });

    },

    template: null,
    initTemplate: function() {
        if (this.template === null) {
            this.template = new EJS({url: chrome.extension.getURL('js/views/projectsList.ejs')});
        }
    },


    div: null,

    projects: []
}