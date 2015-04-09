var CodeInjector = require('../../Utils/CodeInjector.js');
var Utils        = require('../../Utils/Utils.js');

var _sections = {};
var _initialized = false;

module.exports = {

    addSection: function(id, title, channels, isProjectSection) {
        // First use, initialize
        if (_initialized == false) {
            this._initialize();
        }

        // create object section
        // @todo replace by class
        var section = _.find(_sections, function(s) { return s.id == id}) || {};
        section.title = title;
        section.isProjectSection = isProjectSection;
        section.channels = channels;
        section.id = id;

        // add it to the sections
        _sections[id] =  section;

        // add dom
        this.addSectionDivIfNotExist(section);

        this.updateMenuItem(section);
    },


    _initialize: function() {
        _initialized = true;
        this.initTemplate();
        CodeInjector.injectFile("js/ViewHelpers/MenuSectionViewHelper/menuSectionInjectedCode.js");

        Utils.onDomChanged("#channel-list", function() {
            this.update();
        }.bind(this));
    },

    update: function(section) {
        _.each(_sections, function(section) {
            this.updateMenuItem(section);
        }.bind(this));
    },

    reset: function () {
        this.section = [];
    },

// TODO REFACTO
    onChanAdded: function (callback) {
        Utils.onDomChanged("#channel-list", function(mutation) {
            if (mutation.addedNodes.length > mutation.removedNodes.length) {
                callback();
            }
        });
    },

    addSectionDivIfNotExist: function(section) {
        if ($("#"+section.id).length == 0) {
            var div = '<div id="' + section.id + '" class="SPM-section-added section_holder"></div>';
            var index = 0;
            if ($("#starred_div").length > 0) {
                var index = 1;
            }
            $("#channels_scroller").children().eq(index).before(div);
        }

        this.template.update(section.id, {
            channels: section.channels,
            getDueDate: Utils.getDueDate,
            title: section.title,
            isProjectSection: section.isProjectSection
        });

    },

    updateMenuItem: function(section) {
        $("#" + section.id + " li.channel").each(function(index) {
            var id = $(this).find(".channel_name").attr("data-channel-id");
            var chan = $("#channel-list .channel_" + id + ", #starred-list .channel_"+id);
            if (!chan.length) {
                $(this).remove();
            } else if ($(this)[0].outerHTML != chan[0].outerHTML) {
                $(this).replaceWith($("#channel-list .channel_" + id + ",#starred-list .channel_"+id).clone());
            }
        });
        CodeInjector.injectCode("TS.client.channel_pane.makeSureActiveChannelIsInView();");
    },

    template: null,
    initTemplate: function() {
        if (this.template === null) {
            this.template = new EJS({url: chrome.extension.getURL('js/ViewHelpers/MenuSectionViewHelper/menuSection.ejs')});
        }
    },


}