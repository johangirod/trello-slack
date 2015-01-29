var TS = TS || {};
TS.ProjectHelper = {
    getProjectNameFromUrl: function(url) {
        var parts = url.split('/');
        var channel = parts[4];
        if (channel.substring(0,2) == 'p-') {
            return channel;
        } else {
            return null;
        }
        /*
        channelParts = channel.split('-');
        if (channelParts[0] == "p") {
            var project = channelParts[1];
             return project.replace(/_/g, " ");
        }
        */
    }
}