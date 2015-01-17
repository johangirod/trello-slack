function addDiv() {
    
}

window.onload = function() {
    var parts = document.URL.split('/');
    var channel = parts[4];
    channelParts = channel.split('-');
    if (channelParts[0] == "p") {
        var project = channelParts[1];
        project = project.replace(/_/g, " ");
        Trello.authorize({
            type: 'popup',
            name: 'trello-slack',
            persist: true,
            expiration: 'never',
            success: function() {
                Trello.boards.get("l49f2LxM", function() {
                    Trello.get("/search", {
                        "query": project, 
                        "idOrganizations": "54b7c3805bcb2dd4a42f4a69",
                        "idBoards" : "54b7c3955fdb8e63ba5819d8"
                    }, function(result) {
                        cards = result.cards;
                        if (cards.length !== 1 ) {
                            alert('nok');
                        } else {
                            var card = cards[0];
                            alert(card.name);
                        }
                    }, function() {
                        alert('nok');
                    });
                }, function() {
                    alert('nok');
                });
                
            }

        })
    }
}
/*
var url = window.location;
*/
