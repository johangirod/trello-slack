var TS = TS || {};

TS.MemberManager = {
    me: null,
    setMe: function() {
        return new Promise(function(success, error){
            if (this.me == null) {
                TS.TrelloManager.request("get","/members/me").then(function(me) {
                    this.me = me;
                    success();
                }.bind(this));
            } else {
                success();
            }
        }.bind(this));

    }
};