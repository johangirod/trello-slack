var connector = require('SPM/connector/TrelloConnector');

module.exports = {
    me: null,
    setMe: function() {
        return new Promise(function(success, error){
            if (this.me == null) {
                connector.request("get","/members/me").then(function(me) {
                    this.me = me;
                    success();
                }.bind(this));
            } else {
                success();
            }
        }.bind(this));

    }
};