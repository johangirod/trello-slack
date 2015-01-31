var SPM = SPM || {};


/* PRIVATE */
var initBoards = function(boardIds) {
    return Promise
        // 1- Getting all the boards
        .all(boardIds.map(function(boardId) {
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

SPM.BoardManager = {
    boardIds: null,
    boards: null,
    init: function(boardIds) {
        this.boardIds = boardIds;
        return initBoards(boardIds)
            .then(function (boards) {
                this.boards = boards;
            }.bind(this))

    }
};