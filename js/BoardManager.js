var TS = TS || {};


/* PRIVATE */
var initBoards = function(boardIds) {
    return Promise
        // 1- Getting all the boards
        .all(boardIds.map(function(boardId) {
            return TS.TrelloManager.request("boards.get", boardId)
        }))
        // 2 - Gettin' all the list for all the boards
        .then(function (boards) {
            return Promise.all(boards.map(function (board) {
                return initLists(board); 
            }));
        })
};

var initLists = function (board) {
    return TS.TrelloManager.request("get", "boards/" + board.id + "/lists")
        .then(function (lists) {
            board.lists = lists;
            return board;
        })
}

TS.BoardManager = {
    boardIds: null,
    boards: null,
    init: function(boardIds) {
        this.boardIds = boardIds;
        return initBoards(boardIds)
            .then(function (boards) {
                this.boards = boards;
            }.bind(this))

    },

    getProject: function(query) {
        return TS.TrelloManager.request("get","/search", {
                "query": query,
                "idOrganizations": _.map(this.boardIds, function(board) {return board.idOrganization}),
                "idBoards" : _.map(this.boardIds, function(board) {return board.id})
            })
        .then(function(result) {
            cards = result.cards;
            if (! cards.length) {
                return Promise.reject("there is no card in Trello with the name: " + query);
            }
            if (cards.length > 1) {
                console.warn("There is several Trello cards associated to this project !")
            } 
            return this.initCard(cards[0])
        }.bind(this));
    },

    initCard: function(card) {
        return Promise.all(card.idMembers.map(function (idMember) {
            return TS.TrelloManager.request("members.get", idMember)
        }))
        .then(function (members) {
            card.members = members;
            return card
        })
    }

};