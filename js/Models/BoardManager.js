var SPM = SPM || {};
SPM.Models = SPM.Models || {};


/* PRIVATE */
var initBoards = function(boardIds) {
    return Promise
        // 1- Getting all the boards
        .all(_.map(boardIds, function(boardId) {
            return SPM.TrelloConnector.request("boards.get", boardId)
        }))
        // 2 - Gettin' all the list for all the boards
        .then(function (boards) {
            return Promise.all(boards.map(function (board) {
                return initLists(board); 
            }));
        })
};

var initLists = function (board) {
    return SPM.TrelloConnector.request("get", "boards/" + board.id + "/lists")
        .then(function (lists) {
            board.lists = lists;
            return board;
        })
}

SPM.Models.BoardManager = {
    boardIds: null,
    boards: null,
    init: function(boardIds) {
        this.boardIds = boardIds;
        return initBoards(boardIds)
            .then(function (boards) {
                this.boards = boards;
            }.bind(this))
    },

    isRegistredBoard: function (id) {
        return this.boards.some(function (board) {
            return board.id === id;
        })
    }
};