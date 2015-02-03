var SPM = SPM || {};
SPM.Models = SPM.Models || {};

SPM.Models.MemberManager = {
    me: null,
    setMe: function() {
        return new Promise(function(success, error){
            if (this.me == null) {
                SPM.TrelloConnector.request("get","/members/me").then(function(me) {
                    this.me = me;
                    success();
                }.bind(this));
            } else {
                success();
            }
        }.bind(this));

    }
};