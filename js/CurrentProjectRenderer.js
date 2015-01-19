var TS = TS || {};
TS.CurrentProjectRenderer = {
    width: null,
    project: null,
    render: function(project) {
        this.project = project;
        // wait since the panel is here :(
        this.waitDomCreated(function() {
            this.addSpaceForDiv();
            this.addDiv();
        }.bind(this));
    },

    addSpaceForDiv: function() {
        if (this.width === null) {
            this.width = $(window).width() - $("#col_channels_bg").width() - 392;
        }
        $("#msgs_scroller_div").css('width',this.width);
        $("#footer").css('right', 392);
    },

    addDiv: function() {
        if ($("#TS-project").length == 0) {
            var members = _.reduce(this.project.members, function(memo, member) {
                return memo + member.fullName + '<br/>';
            }, "");
            $("body").append('<div id="TS-project"><h2>' + this.project.name + '</h2><p>'+ members + '</p><p>' + this.project.desc + '</div>');
        }
    },

    timerId: null,

    waitDomCreated: function(callback) {
        this.timerId = setInterval(function() {
            callback();
        }.bind(this), 1000);
    }
}
