var SPM = SPM || {};
SPM.ViewHelpers = SPM.ViewHelpers || {};

SPM.ViewHelpers.SectionRenderer = {

    codeInserted: false,

    addSection: function(id, title, channels, isProjectSection) {
        var section = {};
        section.title = title;
        section.isProjectSection = isProjectSection;
        section.channels = channels;
        section.id = id;
        this.initTemplate();
        if (!this.codeInserted) {
            SPM.CodeInjector.injectFile("js/ViewHelpers/MenuSectionViewHelper/menuSectionInjectedCode.js");
            this.codeInserted = true;
        }
        this.addSectionDivIfNotExist(section);
        this.initRenderLoop(function() {
            this.update(section);
        }.bind(this));
    },

    timerUpdate: null,
    initRenderLoop: function(callback) {
        this.timerUpdate = setInterval(function() {
            callback();
        }.bind(this), 100);
    },

    update: function(section) {
        this.updateMenuItem(section);
    },


    addSectionDivIfNotExist: function(section) {
        var div = '<div id="' + section.id + '" class="SPM-section-added section_holder"></div>';
        var index = 0;
        if ($("#starred_div").length > 0) {
            var index = 1;
        }
        $("#channels_scroller").children().eq(index).before(div);

        this.template.update(section.id, {
            channels: section.channels,
            title: section.title,
            isProjectSection: section.isProjectSection
        });

    },

    updateMenuItem: function(section) {
        $("#" + section.id + " li.channel").each(function(index) {
            var id = $(this).find(".channel_name").attr("data-channel-id");
            if ($(this)[0].outerHTML != $("#channel-list .channel_" + id + ", #starred-list .channel_"+id)[0].outerHTML) {
                $(this).replaceWith($("#channel-list .channel_" + id + ",#starred-list .channel_"+id).clone());
            }
        })
    },

    template: null,
    initTemplate: function() {
        if (this.template === null) {
            this.template = new EJS({url: chrome.extension.getURL('js/ViewHelpers/MenuSectionViewHelper/menuSection.ejs')});
        }
    },


}