var Utils        = require('../../../Utils/Utils');
var CodeInjector = require('../../../Utils/CodeInjector');
/*
    PRIVATE FUNCTIONS
*/

var panelIsHere = function () {
    return $("#flex_contents").length;
};
var titleIsHere = function () {
    return $("#active_channel_name").length;
};

function PanelRenderer () {
    this.project     = null;
    this.template    = null;
    this.initialized = false;
    this.panelDiv    = null;
    this.titleDiv    = null;
    this.errorDiv    = null;
};
PanelRenderer.prototype = {
    initTemplate: function() {
        if (this.template === null) {
            this.template = new EJS({url: chrome.extension.getURL('js/apps/ProjectPanel/views/panel.ejs')});
        }
    },
    render: function(project) {
        if (!this.initialized) {
            this.initTemplate();

            this.initialized = true;
        }
        this.reset();
        this.project = project;
        if (this.project) {
            this.addTitle(Utils.getDueDate(this.project.due), this.project.name);
        }

        Utils
            .waitUntil(panelIsHere)
            .then(function () {
                this.addPanel();
                //this.openPanel();
            }.bind(this));
    },

    renderNoProject: function() {
        this.reset();
        this.closePanel();
        this.addError('Vous devez créer une carte Trello (si ce n\'est pas déjà fait) et renseigner ce channel slack.\
                        <a id="SPM-copy-slack-chan" href="#"> Voir le lien.</a></span>');
    },

    reset: function() {
        this.project = null;
        // remove div
        this.panelDiv && this.panelDiv.remove();
        this.titleDiv && this.titleDiv.remove();
        this.errorDiv && this.errorDiv.remove();
    },

    addPanel: function() {
        // Create the div if not here
        var div = '<div class="tab-pane active" id="projects_tab"></div>';
        this.panelDiv = $(div).appendTo("#flex_contents");

        this.template.update("projects_tab", {
            project: this.project
        });
    },
    addTitle: function(deadline, title) {
        $(".SPM-title").remove();
        var dom = '<span class="name SPM-title">' +
        ((deadline)? '<span class="SPM-deadline-title">' + deadline + '</span> ' : '') +
        title + '</span>';
        this.titleDiv = $(dom).insertAfter("#active_channel_name");
    },
    addError: function(message) {
        var dom = '<div id="SPM-notif" class="messages_banner"> \
                    <span id="SPM-chan-error" class="overflow-ellipsis"> ' + message + '\
                </div>';
        this.errorDiv = $(dom).insertBefore("#messages_unread_status");
        var chanName = Utils.getProjectNameFromUrl(document.URL)
        CodeInjector.injectCode('\
                $("#SPM-copy-slack-chan").click(function() {\
                window.prompt("Ctrl + C et puis copier dans la description de la carte slack", "\\n**Slack** : [' +
                chanName + '](https://evaneos.slack.com/messages/' + chanName + ')\\n\\n");\
                });\
        ');
    },
    openPanel: function () {
        CodeInjector.injectCode('\
            TSM.openPanel();\
        ');
    },
    closePanel: function () {
        CodeInjector.injectCode('\
            if ($(".flex_pane_showing #flex_toggle").length !== 0) {\
                $("#flex_toggle").trigger("click");\
            }\
        ');
    }
};

module.exports = new PanelRenderer();