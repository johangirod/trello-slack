var connector      = require('../../connector/TrelloConnector');
var buildProject   = require('./TrelloProjectBuilder');

module.exports = {
    searchProject: function(idBoards, query) {
        return connector.request('get','/search', {
            'query': '"'+query+'"',
            'idBoards' : idBoards || [],
            'modelTypes': 'cards',
            'card_members': true,
            'card_board': true,
            'card_list': true
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
        return connector.request('cards.get', id, {
            'members': true,
            'filter': 'open'
        }).then(function (card) {
            // filter cards to keep only the one in the orga board
            buildProject(card);
            return card;
        });
    },

    getMyProjects: function (idBoards) {
        return connector.request('get', '/members/me/cards', {
            'members': true,
            'filter': 'open',
            'limit': 1000
        }).then(function (cards) {
            // filter cards to keep only the one in the orga board
            cards = cards
                .filter(function (card) {
                    return idBoards.indexOf(card.idBoard) !== -1;
                })
                .map(buildProject);
            return Promise.resolve(cards);
        });
    },

    getProjectsByChannelName: function (idBoards, channelName) {
        return this.searchProject(idBoards, channelName)
            .then(function (projects) {
                projects = projects.filter(function (project) {
                    return project.slack == channelName;
                });
                if (projects.length === 0) {
                    console.warn('No Trello cards found for the project ' + channelName);
                }
                return projects;
            });
    }
}