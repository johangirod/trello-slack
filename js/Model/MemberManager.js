var connector      = require('SPM/connector/TrelloConnector');
var ChannelManager = require('SPM/Storage/Manager');
var LocalStorage   = require('SPM/Storage/LocalStorage');

// TODO : Passer en mode localstorage
function TrelloMemberReader() {};
TrelloMemberReader.prototype.getMe = function() {
    connector.request("get","/members/me");
};