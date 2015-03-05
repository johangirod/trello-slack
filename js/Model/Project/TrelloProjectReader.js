var connector      = require('SPM/connector/TrelloConnector');
var buildProject   = require('SPM/Model/Project/TrelloProjectBuilder');


var _boards = [];

var initLists = function (board) {
    return connector.request("get", "boards/" + board.id + "/lists")
        .then(function (lists) {
            board.lists = lists;
            return board;
        });
};

var isRegistredBoardId = function (id) {
    return _boards.some(function (board) {
        return board.id === id;
    });
};

module.exports = {
    setBoards: function(boardIds) {
        return Promise
        // 1- Getting all the boards
        .all(_.map(boardIds, function(boardId) {
            return connector.request("boards.get", boardId);
        }))
        // 2 - Gettin' all the list for all the boards
        .then(function (boards) {
            _boards = boards;
            return Promise.all(boards.map(function (board) {
                return initLists(board);
            }));
        });
    },

    getBoards: function() {
        return _boards;
    },

    searchProject: function(query) {
        return connector.request("get","/search", {
            "query": '"'+query+'"',
            "idOrganizations": _.map(this._boards, function(board) {return board.idOrganization}),
            "idBoards" : _.map(this._boards, function(board) {return board.id}),
            "modelTypes": "cards",
            "card_members": true
        })
        .then(function(result) {
            var cards = result.cards;

            // remove archived project
            cards = _.filter(cards, function(project) {
                return !project.closed;
            });
            var card;
            if (! cards.length) {
                card = null;
            } else {
                cards.forEach(function (card) {
                    buildProject(card);
                });
            }
            return cards;
        }.bind(this));
    },

    getById: function(id) {
        return connector.request("cards.get", id, {
            "members": true,
            "filter": "open"
        }).then(function (card) {
            // filter cards to keep only the one in the orga board
            buildProject(card);
            return card;
        });
    },

    getMyProjects: function () {
        return connector.request("get", "/members/me/cards", {
            "members": true,
            "filter": "open",
            "limit": 1000
        }).then(function (cards) {
            // filter cards to keep only the one in the orga board
            cards = cards
                .filter(function (card) {
                    return isRegistredBoardId(card.idBoard);
                })
                .map(buildProject);
            return Promise.resolve(cards);
        }).catch(function() {
            console.warn("no data getMyProjects");
        });
    },

    getProjectByChannelName: function (channelName) {

        return this.searchProject(channelName)
            .then(function (projects) {
                projects = projects.filter(function (project) {
                    return project.slack == channelName;
                });
                var project = null;
                if (projects.length > 1) {
                    console.warn("More than one Trello cards found for the project " + channelName);
                    _.map(projects, function(project) {
                        project.errors.moreThanOneTrelloCard = projects;
                    });
                    var maxDate = Math.max.apply(projects.map(function (p) {return p.created_at;}));
                    project = _.find(projects, function (project) {
                        return project.created_at === maxDate;
                    });
                }
                if (projects.length === 0) {
                    console.warn("No Trello cards found for the project " + channelName);
                    project = null;
                } else {
                    project = projects[0];
                }
                return project;
            });
    }
}