var SPM = SPM || {};
SPM.Models = SPM.Models || {};

SPM.Models.ChannelManager = {
    channelNames: [],
    getChannelNames: function() {
        this.initChannels();
        return this.channelNames;
    },

    /*
    * function which returns the list of channels beginning by 'p-'
     */
    getProjectChannelNames: function() {
        this.initChannels();
        return _.filter(this.getChannelNames(), function(channelName) {
            return channelName.slice(0, 2) == 'p-';
        })
    },

    /*
    * function which returns the list of channels which don't begin by 'p-'
     */
    getNotProjectChannelNames: function() {
        this.initChannels();
        return _.filter(this.getChannelNames(), function(channelName) {
            return channelName.slice(0, 2) != 'p-';
        })
    },

    channelIds: [],
    getChannelIds: function() {
        this.initChannels();
        return this.channelIds;
    },

    /*
    * This is to know that channelIds and channelNames are up-to-date.
     */
    initChannels: function(force) {
        if (force || this.channelIds.length == 0) {
            // Get Channels in Channels list
            this.channelIds = $.map($("#channel-list a.channel_name, #starred-list a.channel_name"), function(a, index) {
                return $(a).attr("data-channel-id");
            });

            this.channelNames = $.map($("#channel-list li .overflow-ellipsis, #starred-list li a.channel_name .overflow-ellipsis"), function(li, index) {
                return $(li).text().replace(/(\r\n|\n|\r|\s+)/gm,"").slice(1);
            });

            // Get Channels in Starred List

        }
    },

    getChannelIdFromChannelName: function(channelName) {
        return this.channelIds[_.indexOf(this.channelNames, channelName)];
    }


}