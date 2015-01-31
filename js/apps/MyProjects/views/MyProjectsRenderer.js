var SPM = SPM || {};
SPM.Apps = SPM.Apps || {};
SPM.Apps.MyProjects = SPM.Apps.MyProjects || {};
SPM.Apps.MyProjects.Views = SPM.Apps.MyProjects.Views || {};

SPM.Apps.MyProjects.Views.MyProjectsRenderer = {
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
        var div = '<div id="SPM-my_project" class="section_holder"></div>';
        if ($("#starred_div").length > 0) {
            $("#starred_div").after(div);
        } else {
            $("#channels_scroller").prepend(div);
        }

        this.template.update("SPM-my_project", {
            projects: this.projects
        });

    },

    updateStateOfProject: function() {
        $("#SPM-my_project li.channel").each(function(index) {
            var id = $(this).find(".channel_name").attr("data-channel-id");
            if ($(this)[0].outerHTML != $("#channel-list .channel_"+id)[0].outerHTML) {
                $(this).replaceWith($("#channel-list .channel_"+id).clone());
            }
        })
    },

    template: null,
    initTemplate: function() {
        if (this.template === null) {
            this.template = new EJS({url: chrome.extension.getURL('js/apps/MyProjects/views/myProjects.ejs')});
        }
    },


    div: null,

    projects: []
}