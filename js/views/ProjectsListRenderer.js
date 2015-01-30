var TS = TS || {};

TS.ProjectsListRenderer = {
    render: function(projects) {
        this.projects = projects;
        this.initTemplate();
        this.addDiv();
        this.initRenderLoop(this.update.bind(this));
    },

    timerUpdate: null,
    initRenderLoop: function(callback) {
        if (this.timerUpdate == null) {
            this.timerUpdate = setInterval(function() {
                callback();
            }.bind(this), 100);
        }
    },

    update: function() {
        this.updateStateOfProject();
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

    updateStateOfProject: function() {
        $("#TS-my_project li.channel").each(function(index) {
            var id = $(this).find(".channel_name").attr("data-channel-id");
            if ($(this)[0].outerHTML != $("#channel-list .channel_"+id)[0].outerHTML) {
                $(this).replaceWith($("#channel-list .channel_"+id).clone());
            }
        })
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