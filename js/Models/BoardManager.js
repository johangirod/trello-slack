var SPM = SPM || {};


/* PRIVATE */
var initBoards = function(boardIds) {
    return Promise
        // 1- Getting all the boards
        .all(_.map(boardIds, function(boardId) {
            return SPM.TrelloConnector.request("boards.get", boardId)
        }.bind(this)))
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
    boards: {},
    init: function(boardIds) {
        this.boardIds = boardIds;
        return initBoards(boardIds)
            .then(function (boards) {
                _.each(boards, function(board) {
                    this.boards[board.name] = board;
                }.bind(this))
                this.boards = boards;
            }.bind(this))

    },

    getBoardByName: function(boardName) {
        return this.boards[boardName];
    }
};