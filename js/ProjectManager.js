var TS = TS || {};
TS.ProjectManager = {
    mainBoardUrlId: null,
    /*
    closed
    desc
    descData
    id
    idOrganization
    labelNames:{color: name}
    name
    pinned
    prefs
    shortUrl
    url
    */
    mainBoard: null,

    onError: function() {
        alert('nok');
    },

    init: function(id) {
        this.mainBoardUrlId = id;
        return new Promise(function(success, error) {
            this.initTrelloConnection().then(function() {
                Promise.all([
                    new Promise(function(success, error) {
                        this.getBoardFromId(this.mainBoardUrlId).then(function(board) {
                            success(board);
                        });
                    }.bind(this)),
                    new Promise(function(success, error) {
                        this.setMe().then(function() {
                            success();
                        })
                    }.bind(this))
                ]).then(function(values) {
                    this.mainBoard = values[0];
                    success();
                }.bind(this));
            }.bind(this)).catch(this.onError);
        }.bind(this));
    },

    setMe: function() {
        return new Promise(function(success, error) {
            Trello.get("members/me", function() {
                success();
            }, function() {
                alert('nok me');
            });
        });
    },

    getBoardFromId: function(id) {
        return new Promise(function(success, error) {
            Trello.boards.get("l49f2LxM", success, error);
        });
    },

    initTrelloConnection: function(success, error) {
        return new Promise(function(success, error) {
            Trello.authorize({
                type: 'popup',
                name: 'trello-slack',
                persist: true,
                expiration: 'never',
                success: success,
                error: error
            })
        });
    },

    searchProject: function(query) {
        return new Promise(function(success, error) {
            Trello.get("/search", {
                "query": query, 
                "idOrganizations": this.mainBoard.idOrganization,
                "idBoards" : this.mainBoard.id
            }, function(result) {
                cards = result.cards;
                if (cards.length !== 1 ) {
                    error("there is no card in Trello with the name: " + query);
                } else {
                    var card = cards[0];
                    this.completeCard(card).then(function() {
                        success(card);
                    })
                }
            }.bind(this), function() {
                error("There was an error with the query to Trello...");
            }.bind(this));
        }.bind(this));

    },

    completeCard: function(card) {
        return new Promise(function(success, error) {
            var promises = [];
            card.members = [];
            for(var i = 0 ; i < card.idMembers.length ; i++) {
                promises.push(new Promise(function(successi, errori) {
                    Trello.members.get(card.idMembers[i], function(member) {
                        card.members.push(member);
                        successi();
                    }, function() {
                        alert('member doesnt exist!!!');
                    });
                }.bind(this)));
            };
            Promise.all(promises).then(function(values) {
                success();
            }.bind(this)).catch(function() {
                alert('not ok completeCard');
            });
        }.bind(this));
    }
};