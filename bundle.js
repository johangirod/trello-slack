(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/home/johan/projets/trello-slack/js/main.js":[function(require,module,exports){
var TrelloConnector       = require('SPM/connector/TrelloConnector');
var MemberManager         = require('SPM/Model/MemberManager');
var ProjectManager        = require('SPM/Model/Project/ProjectManager');
var PanelRenderer         = require('SPM/apps/ProjectPanel/views/PanelRenderer');
var PanelInitalizer       = require('SPM/apps/ProjectPanel/PanelInitializer');
var MyProjectsInitializer = require('SPM/apps/MyProjects/MyProjectsInitializer');
var ToggleMenuInitializer = require('SPM/apps/ToggleMenu/ToggleMenuInitializer');
var TrelloProjectReader   = require('SPM/Model/Project/TrelloProjectReader');


var _boardsIds = {
    arborium: "54b94910f186c08595048a8f",
    seeds: "54b7c3955fdb8e63ba5819d8"
}

var _buildModel = function() {
    return TrelloProjectReader.setBoards(_boardsIds);
};

var init = {

    /**
    * Let's go!
    */
    currentProjectName: null,
    date: moment(),
    init: function() {
        TrelloConnector
            .initConnection()
            .then(function() {
                return MemberManager.setMe();
            }.bind(this))
            .then(function() {
                return _buildModel();
            })
            .then(function() {
                PanelRenderer.setBoards(TrelloProjectReader.getBoards());
                PanelInitalizer.init();
                MyProjectsInitializer.setBoardIds(_boardsIds);
                MyProjectsInitializer.init();
                ToggleMenuInitializer.init();

            }.bind(this))
            .catch(function (error) {
                console.error(error);
            })

        var myFirebaseRef = new Firebase("https://trello.firebaseio.com/");
        myFirebaseRef.child("projects")
        .on("child_added", function(snapshot) {
            this.update(snapshot.val().id, snapshot.val().updated_at);
        }.bind(this));
        myFirebaseRef.child("projects")
        .on("child_changed", function(snapshot) {
            this.update(snapshot.val().id, snapshot.val().updated_at);
        }.bind(this));
    },
    update: function(id, date) {
        if (this.date.isBefore(moment(date))) {
            ProjectManager.updateProjectById(id).then(function(project) {
                PanelInitalizer.updateProject(project);
                MyProjectsInitializer.updateProject(project);
            })
        } else {
            return false;
        }
    }
}

window.onload = function() {
    // debugger;
    init.init();
}
},{"SPM/Model/MemberManager":"/home/johan/projets/trello-slack/js/node_modules/SPM/Model/MemberManager.js","SPM/Model/Project/ProjectManager":"/home/johan/projets/trello-slack/js/node_modules/SPM/Model/Project/ProjectManager.js","SPM/Model/Project/TrelloProjectReader":"/home/johan/projets/trello-slack/js/node_modules/SPM/Model/Project/TrelloProjectReader.js","SPM/apps/MyProjects/MyProjectsInitializer":"/home/johan/projets/trello-slack/js/node_modules/SPM/apps/MyProjects/MyProjectsInitializer.js","SPM/apps/ProjectPanel/PanelInitializer":"/home/johan/projets/trello-slack/js/node_modules/SPM/apps/ProjectPanel/PanelInitializer.js","SPM/apps/ProjectPanel/views/PanelRenderer":"/home/johan/projets/trello-slack/js/node_modules/SPM/apps/ProjectPanel/views/PanelRenderer.js","SPM/apps/ToggleMenu/ToggleMenuInitializer":"/home/johan/projets/trello-slack/js/node_modules/SPM/apps/ToggleMenu/ToggleMenuInitializer.js","SPM/connector/TrelloConnector":"/home/johan/projets/trello-slack/js/node_modules/SPM/connector/TrelloConnector.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/Model/MemberManager.js":[function(require,module,exports){
var connector = require('SPM/connector/TrelloConnector');

module.exports = {
    me: null,
    setMe: function() {
        return new Promise(function(success, error){
            if (this.me == null) {
                connector.request("get","/members/me").then(function(me) {
                    this.me = me;
                    success();
                }.bind(this));
            } else {
                success();
            }
        }.bind(this));

    }
};
},{"SPM/connector/TrelloConnector":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/Model/Project/ProjectManager.js":[function(require,module,exports){
var MemberManager         = require('SPM/Model/MemberManager');
var ProjectStorage        = require('SPM/Model/Project/ProjectStorage');
var TrelloProjectReader   = require('SPM/Model/Project/TrelloProjectReader');

var _storages = [ProjectStorage, TrelloProjectReader];

var _getFromStorageI = function(methodName, args, i) {
    if (typeof _storages[i] == 'undefined') {
        return Promise.reject('storage ' + i + ' not defined');
    }
    if (typeof _storages[i][methodName] == 'undefined') {
        return Promise.reject('the method ' + methodName + ' is not defined for the ' + i + 'th storage');
    }
    return _storages[i][methodName].apply(_storages[i], args);
}

var _getFromStorage = function(methodName, args, i) {
    if (typeof i == 'undefined') {
        i = 0;
    }
    // @todo execute method with args
    return _getFromStorageI(methodName, args, i)
    .then(function(result) {
        return _updatePreviousCache(i, result, methodName, args).then(function(result) {
            return result;
        });
    }.bind(this))
    .catch(function () {
        if (i == _storages.length) {
            console.log(_storages, methodName)
            return Promise.reject('nothing in all storages :(');
        }
        i ++;
        return _getFromStorage(methodName, args, i);
    }.bind(this))
}

var _updatePreviousCache = function(n, result, methodName, args) {
    if (n-1 > 0) {
        for (var i = n - 1 ; i >= 0 ; i --) {
            this._storages[i].saveResult(result, methodName, args);
        }
    }
    return Promise.resolve(result);
}

module.exports = {
    isMyProject: function(project) {
        return _.find(project.members, function(member) {
            return MemberManager.me.id == member.id;
        })
    },

    getMyProjects: function () {
        return _getFromStorage("getMyProjects", []);
    },

    getProjectByChannelName: function (channelName) {
        return _getFromStorage("getProjectByChannelName", [channelName]);
    },

    updateProjectById: function(id) {
        return _getFromStorage("getById", [id])
        .then(function(project) {
            return _getFromStorage("removeProjet", [project])
        })
        .then(function() {
            return _getFromStorage("getById", [id]);
        });
    },

    getById: function(id) {
        return _getFromStorage("getById", [id]);
    }
}
},{"SPM/Model/MemberManager":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/MemberManager.js","SPM/Model/Project/ProjectStorage":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/Project/ProjectStorage.js","SPM/Model/Project/TrelloProjectReader":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/Project/TrelloProjectReader.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/Model/Project/TrelloProjectReader.js":[function(require,module,exports){
var connector      = require('SPM/connector/TrelloConnector');
var projectBuilder = require('SPM/Model/Project/TrelloProjectBuilder');


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
                    projectBuilder.build(card);
                });
            }
            return Promise.resolve(cards);
        }.bind(this));
    },

    getById: function(id) {
        return connector.request("cards.get", id, {
            "members": true,
            "filter": "open"
        }).then(function (card) {
            // filter cards to keep only the one in the orga board
            projectBuilder.build(card);
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
                .map(projectBuilder.build);
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
                if (projects.length > 1) {
                    console.warn("More than one Trello cards found for the project " + channelName);
                    _.map(projects, function(project) {
                        project.errors.moreThanOneTrelloCard = projects;
                    });
                    // @todo sort by created_at date DESC
                    project = projects[0];
                }
                if (projects.length === 0) {
                    console.warn("No Trello cards found for the project " + channelName);
                    projects = null;
                } else {
                    project = projects[0];
                }
                return project;
            });
    },

    saveResult: function(result, methodName, arguments) {
        return true;
    },

    removeProjet: function(project) {
        return Promise.resolve(project);
    }
}
},{"SPM/Model/Project/TrelloProjectBuilder":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/Project/TrelloProjectBuilder.js","SPM/connector/TrelloConnector":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/apps/MyProjects/MyProjectsInitializer.js":[function(require,module,exports){
var Utils           = require('SPM/Utils/Utils');
var ChannelManager  = require('SPM/Model/ChannelManager');
var ProjectManager  = require('SPM/Model/Project/ProjectManager');
var SectionRenderer = require('SPM/ViewHelpers/MenuSectionViewHelper/MenuSectionRenderer');

var numberOfProjects = 0;

var waitUntilChannelsAreHere = function() {
    return Utils.waitUntil(function() {
        return numberOfProjects != $("#channel-list li").length;
    });
};

var getMyProjectsInBoard = function(boardId) {
    return ProjectManager.getMyProjects().then(function (projects) {
        return projects
            .filter(function (project) {
                return project.idBoard == boardId;
            })
            .map(function (project) {
                return ChannelManager.createChannel(project);
            })
    })
}

var getNotMyProjectFollowed = function() {
    promises = ChannelManager
    // 1 - Get project or channel name that I follow
        .getProjectChannelNames()
        .map(function (channelName) {
            return ProjectManager
                .getProjectByChannelName(channelName)
                .then(function (project) {
                    return project || channelName;
                })
        });
    // 2 - Filter those whose I am member and transforms them to channel
    return Promise.all(promises).then(function (projectOrChannelNames) {
            return projectOrChannelNames
                .filter(function (pocn) {
                    return  (typeof pocn === "string" ) || !ProjectManager.isMyProject(pocn)
                })
                .map(function (pocn) {
                    return ChannelManager.createChannel(pocn);
                })
        })
}

var _boardsIds = [];

var renderChannels = function() {
    Promise.all([
    // 1 - Get channels by category
        Promise.resolve(ChannelManager.getNotProjectChannels()),    // Other non project Channels
        getNotMyProjectFollowed(),                                  // Project followed, but not member
        getMyProjectsInBoard(_boardsIds.seeds),                     // My project in seed
        getMyProjectsInBoard(_boardsIds.arborium)                   // My projects in arborium
    ]).then(function (channel) {
        var myProjectsDone = _.partition(channel[3], function(channel) {
            return ["54b949c70a8cc363f4cbdf74", "54b949ca8aa6d6fba4c87700"].indexOf(channel.project.idList) == -1;
        });
    // 2 - Render the channels
        SectionRenderer.addSection("SPM-other_channe", "AUTRE CHANNELS", channel[0], false);
        SectionRenderer.addSection("SPM-project-followed", "MES PROJETS SUIVIS", channel[1], true);
        SectionRenderer.addSection("SPM-my_project_done", "MES PROJETS FINIS", myProjectsDone[0], true);
        SectionRenderer.addSection("SPM-project", "MES GRAINES", channel[2], true);
        SectionRenderer.addSection("SPM-my_project", "MES PROJETS", myProjectsDone[1], true);
        $("#channel-list").hide();
    }).catch(function() {
        console.log('bug in MyProjects app');
    });
}

module.exports = {
    init: function() {
;        return waitUntilChannelsAreHere()
            .then(renderChannels);
    },

    updateProject: function(project) {
        renderChannels();
    },

    setBoardIds: function(boardIds) {
        _boardsIds = boardIds;
    }
};



},{"SPM/Model/ChannelManager":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/ChannelManager.js","SPM/Model/Project/ProjectManager":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/Project/ProjectManager.js","SPM/Utils/Utils":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/Utils.js","SPM/ViewHelpers/MenuSectionViewHelper/MenuSectionRenderer":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/ViewHelpers/MenuSectionViewHelper/MenuSectionRenderer.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/apps/ProjectPanel/PanelInitializer.js":[function(require,module,exports){
var CodeInjector   = require('SPM/Utils/CodeInjector.js');
var UrlChanged     = require('SPM/Utils/UrlChanged.js');
var Utils          = require('SPM/Utils/Utils.js');
var ProjectManager = require('SPM/Model/Project/ProjectManager.js');
var PanelRenderer  = require('SPM/apps/ProjectPanel/views/PanelRenderer.js');

module.exports = {
    init: function() {
        CodeInjector.injectFile("js/apps/ProjectPanel/panelInjectedCode.js");

        UrlChanged.onChanged(function() {
            this.onChanged();
        }.bind(this));
        this.onChanged();
        return true;

    },

    renderCurrentProject: function() {
        return ProjectManager
            .getProjectByChannelName(this.currentProjectName)
            .then(function(project) {
                return (project)?
                    PanelRenderer.render(project):
                    PanelRenderer.renderNoProject();
            });
    },

    onChanged: function(force) {

        var projectName = Utils.getProjectNameFromUrl(document.URL);
        if (force || this.currentProjectName !== projectName) {
            this.currentProjectName = projectName;
            if (this.currentProjectName) {
               this.renderCurrentProject();
            } else {
                PanelRenderer.reset();
                PanelRenderer.closePanel();
            }
        }

    },

    updateProject: function(project) {
        this.onChanged(true);
    }
}
},{"SPM/Model/Project/ProjectManager.js":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/Project/ProjectManager.js","SPM/Utils/CodeInjector.js":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/CodeInjector.js","SPM/Utils/UrlChanged.js":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/UrlChanged.js","SPM/Utils/Utils.js":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/Utils.js","SPM/apps/ProjectPanel/views/PanelRenderer.js":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/apps/ProjectPanel/views/PanelRenderer.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/apps/ProjectPanel/views/PanelRenderer.js":[function(require,module,exports){
var Utils        = require('SPM/Utils/Utils');
var CodeInjector = require('SPM/Utils/CodeInjector');
/*
    PRIVATE FUNCTIONS
*/

var panelIsHere = function () {
    return $("#flex_contents").length
}
var titleIsHere = function () {
    return $("#active_channel_name").length
}

module.exports = {

    template: null,
    initTemplate: function() {
        if (this.template === null) {
            this.template = new EJS({url: chrome.extension.getURL('js/apps/ProjectPanel/views/panel.ejs')});
        }
    },

    boards: null,
    project: null,

    setBoards: function(boards) {
        this.boards = boards;
        return this;
    },
    initialized: false,
    render: function(project) {
        if (!this.initialized) {
            this.initTemplate();

            this.initialized = true;
        }
        this.reset();
        this.project = project;
        if (this.project) {
            this.addTitle(Utils.getDueDate(this.project.due), this.project.name);
        }

        if (this.project.errors && this.project.errors.moreThanOneTrelloCard) {
            var projects = this.project.errors.moreThanOneTrelloCard.reduce(function(memo, project) {
                return memo + ' - '+ project.name;
            }, "");
            this.addError('Plusieurs projets pointent vers cette discussion Slack: ' + projects);
        }



        Utils
            .waitUntil(panelIsHere)
            .then(function () {
                this.addPanel();
                //this.openPanel();
            }.bind(this))
    },

    renderNoProject: function() {
        this.reset();
        this.closePanel();
        this.addError('Vous devez créer une carte Trello (si ce n\'est pas déjà fait) et renseigner ce channel slack.\
                        <a id="SPM-copy-slack-chan" href="#"> Voir le lien.</a></span>');
    },

    reset: function() {
        this.project = null;
        // remove div
        this.panelDiv && this.panelDiv.remove();
        this.titleDiv && this.titleDiv.remove();
        this.errorDiv && this.errorDiv.remove();
    },

    panelDiv: null,
    addPanel: function() {
        // Create the div if not here
        var div = '<div class="tab-pane active" id="projects_tab"></div>';
        this.panelDiv = $(div).appendTo("#flex_contents");

        this.template.update("projects_tab", {
            project: this.project,
            boards: this.boards
        });
    },
    titleDiv: null,
    addTitle: function(deadline, title) {
        $(".SPM-title").remove();
        var dom = '<span class="name SPM-title">' +
        ((deadline)? '<span class="SPM-deadline-title">' + deadline + '</span> ' : '') +
        title + '</span>';
        this.titleDiv = $(dom).insertAfter("#active_channel_name");
    },
    errorDiv: null,
    addError: function(message) {
        var dom = '<div id="SPM-notif" class="messages_banner"> \
                    <span id="SPM-chan-error" class="overflow-ellipsis"> ' + message + '\
                </div>';
        this.errorDiv = $(dom).insertBefore("#messages_unread_status");
        var chanName = Utils.getProjectNameFromUrl(document.URL)
        CodeInjector.injectCode('\
                $("#SPM-copy-slack-chan").click(function() {\
                window.prompt("Ctrl + C et puis copier dans la description de la carte slack", "\\n**Slack** : [' +
                chanName + '](https://evaneos.slack.com/messages/' + chanName + ')\\n\\n");\
                });\
        ');
    },
    openPanel: function () {
        CodeInjector.injectCode('\
            TSM.openPanel();\
        ');
    },
    closePanel: function () {
        CodeInjector.injectCode('\
            if ($(".flex_pane_showing #flex_toggle").length !== 0) {\
                $("#flex_toggle").trigger("click");\
            }\
        ');
    }
}
},{"SPM/Utils/CodeInjector":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/CodeInjector.js","SPM/Utils/Utils":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/Utils.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/apps/ToggleMenu/ToggleMenuInitializer.js":[function(require,module,exports){
var CodeInjector = require('SPM/Utils/CodeInjector.js');

module.exports = {
    init: function() {
        CodeInjector.injectFile("js/apps/ToggleMenu/toggleMenuInjectedCode.js");
        return true;
    }
}
},{"SPM/Utils/CodeInjector.js":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/CodeInjector.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/connector/TrelloConnector.js":[function(require,module,exports){
module.exports = {
    initConnection: function(success, error) {
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

    request: function (method, pathOrId, params) {
        var methodThis;
	    var method = method
	    		.split(".")
	    		.reduce(function (trelloFunc, method) {
                    methodThis = trelloFunc;
		    		return trelloFunc[method];
		    	}, Trello)
    	return new Promise(function(success, error) {
			method.call(methodThis, pathOrId, params || {}, success, error);
    	})
        // Little log proxy for Trello API errors :)
        .catch(function (error) {
            console.error("Error in Trello API: ", error);
            return error;
        })
    }
};
},{}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/ChannelManager.js":[function(require,module,exports){
module.exports = {
    channelNames: [],
    getChannelNames: function() {
        this.initChannels();
        return this.channelNames;
    },

    getProjectChannelNames: function () {
        return this.getChannelNames().filter(this.isProjectChannel.bind(this));
    },
    /*
    * function which returns the list of channels which don't begin by 'p-'
     */
    getNotProjectChannels: function() {
        return _.filter(this.getChannelNames(), function(channelName) {
            return !this.isProjectChannel(channelName);
        }.bind(this)).map(function (channelName) {
            return this.createChannel(channelName);
        }.bind(this))
    },

    channelIds: [],
    getChannelIds: function() {
        this.initChannels();
        return this.channelIds;
    },

    /*
    * This is to know that channelIds and channelNames are up-to-date.
     */
    initChannels: function(force) {
        if (force || this.channelIds.length == 0) {
            // Get Channels in Channels list
            this.channelIds = $.map($("#channel-list a.channel_name, #starred-list a.channel_name"), function(a, index) {
                return $(a).attr("data-channel-id");
            });

            this.channelNames = $.map($("#channel-list li a.channel_name .overflow_ellipsis, #starred-list li a.channel_name .overflow_ellipsis"), function(li, index) {
                return $(li).text().replace(/(\r\n|\n|\r|\s+)/gm,"").slice(1);
            });

            // Get Channels in Starred List

        }
    },

    getChannelIdFromChannelName: function(channelName) {
        return this.channelIds[_.indexOf(this.channelNames, channelName)];
    },

    isProjectChannel:function (channelName) {
        return channelName.indexOf('p-') === 0;
    },


    createChannel: function (channelOrProject) {
        // 1 - If it's a channel
        if (typeof channelOrProject === "string") {
            var id = this.getChannelIdFromChannelName(channelOrProject)
            return  {
                name: channelOrProject,
                slackId: id
            };
        }
        // 2 - If it's a project
        var project = channelOrProject;
        var channel = {}
        if (project.slack) {
            channel.name = project.slack
            channel.slackId = this.getChannelIdFromChannelName(project.slack)
        } else {
            channel.name = project.name;
        }
        channel.project = project;
        return channel;
    }

}
},{}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/MemberManager.js":[function(require,module,exports){
arguments[4]["/home/johan/projets/trello-slack/js/node_modules/SPM/Model/MemberManager.js"][0].apply(exports,arguments)
},{"SPM/connector/TrelloConnector":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/Project/ProjectManager.js":[function(require,module,exports){
arguments[4]["/home/johan/projets/trello-slack/js/node_modules/SPM/Model/Project/ProjectManager.js"][0].apply(exports,arguments)
},{"SPM/Model/MemberManager":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Model/MemberManager.js","SPM/Model/Project/ProjectStorage":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Model/Project/ProjectStorage.js","SPM/Model/Project/TrelloProjectReader":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Model/Project/TrelloProjectReader.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/Project/ProjectStorage.js":[function(require,module,exports){
var Utils = require('SPM/Utils/Utils.js');

var _projects = {};
var _projectsByChannel = {};
var _projectsByUser = {};
var _projectsBySearch = {};
var _me = null;

module.exports = {
    setMe: function(me) {
        _me = me;
    },

    setUtils: function(utils) {
        _utils = utils;
    },

	saveProject: function(project) {
		_projects[project.id] = project;
		if (project.slack) {
			_projectsByChannel[project.slack] = project.id;
		}
        if (project.members) {
            _.map(project.members, function(member) {
                if (typeof _projectsByUser[member.id] == 'undefined') {
                    _projectsByUser[member.id] = [];
                }
                _projectsByUser[member.id].push(project);
            })
        }
        return project;
    },

    removeProjet: function(project) {
        if (_utils.removeFromObject(project.id, _projects)) {
            if (project.slack) {
                _utils.removeFromObject(project.slack, _projectsByChannel);
            }
            if (project.members) {
                _.map(project.members, function(member) {
                    _utils.removeFromObject(member.id, _projectsByUser);
                })
            }
            return Promise.resolve(project);

        } else {
            return Promise.reject('not here');
        };
    },

    saveProjects: function (projects) {
      projects.forEach(function (project) {
         this.saveProject(project);
     }.bind(this))
      return projects;
    },

    searchProject: function(search) {
        var projectId = _projectsBySearch[search]
        return (projectId === undefined)?
        Promise.reject("No data"):
        Promise.resolve(_projects[projectId]);
    },

    getProjectsByUser: function (user) {
        var projects = _.filter(_projects, function(project) {
            return _.find(project.members, function(member) {
                return member.id == user.id;
            }.bind(this));
        }.bind(this));
        if (projects.length > 0) {
            return Promise.resolve(projects);
        } else {
            return Promise.reject("No data")
        }
    },

    getMyProjects: function() {
        return this.getProjectsByUser(_me);
    },

    noProjectForChannel: function (channelName) {
      _projectsByChannel[channelName] = false;
    },

    noProjectForUser: function (user) {
        _projectsByUser[user.id] = false;
    },

    getProjectByChannelName: function (channelName) {
      var projectId = _projectsByChannel[channelName]
      return (projectId === undefined)?
      Promise.reject("No data"):
      Promise.resolve(_projects[projectId]);
    },

    saveResult: function(result, methodName, arguments) {
        if (Utils.isArray(result)) {
            this.saveProjects(result);
        } else {
            this.saveProject(result);
        }
        return true;
    },

    getById: function(id) {
        if (typeof _projects[id] != 'undefined') {
            return Promise.resolve(_projects[id]);
        } else {
            return Promise.reject('not here');
        }

    }
}
},{"SPM/Utils/Utils.js":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/Utils.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/Project/TrelloProjectBuilder.js":[function(require,module,exports){
var Utils = require('SPM/Utils/Utils.js');

var parseLeader = function (project) {
    var leader = Utils.parseGetValueFromKey(project.desc, 'leader');
    if (!leader) {
        project.errors.noLeader = true;
        return false;
    }
    leader = Utils.unaccent(leader);
    if(leader[0] === '@') {
        // With the @name syntax
        leader = leader.slice(1);
    }
    var leaderFound = project.members.some(function (member) {
        var memberName = Utils.unaccent(member.fullName.toLowerCase());
        if (memberName.indexOf(leader) !== -1) {
            member.isLeader = true;
            return true;
        }
        return false;
    });
    if (leaderFound) {
        // Leader first
        project.members.sort(function (member1, member2) {
            return (member1.isLeader) ? -1 : (member2.isLeader) ? 1 : 0;
        });
    } else {
        project.errors.unknownLeader = true;
    }
    return leaderFound;
};

var parseSlack = function(project) {
    var slack = Utils.parseGetValueFromKey(project.desc, '(slack|channel|chanel|chan)');
    if (!slack) {
        return
    }
    if(slack[0] === '[') {
        // With the [name](url) syntax
        var index = slack.indexOf(']');
        slack = slack.slice(1, index);
    }
    if (slack[0] === '#') {
        // With the # syntax
        slack = slack.slice(1)
    }
    if(slack.indexOf('p-') !== 0) {
        return null;
    }
    project.slack = slack;
    return project.slack;
};

var checkErrors = function (project) {
    if (project.idMembers.length > 5) {project.errors.tooManyMembers = true};
    if (project.idMembers.length < 2) {project.errors.tooFewMembers = true};
    if (project.name.match(/^#?p-.*/)) {project.errors.titleIsSlackChan = true};
};

var initProject = function(project) {
    project.errors = {};
    var leader = parseLeader(project);
    var slack = parseSlack(project);
    // Need to 2x the line break for ISO trello markdown rendering
    project.desc = Utils.doubleLineBreak(project.desc);
    // Capitalize first letter
    project.name = project.name.charAt(0).toUpperCase() + project.name.slice(1);
    checkErrors(project);
    return project;
};

module.exports = initProject;
},{"SPM/Utils/Utils.js":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/Utils.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/Project/TrelloProjectReader.js":[function(require,module,exports){
arguments[4]["/home/johan/projets/trello-slack/js/node_modules/SPM/Model/Project/TrelloProjectReader.js"][0].apply(exports,arguments)
},{"SPM/Model/Project/TrelloProjectBuilder":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Model/Project/TrelloProjectBuilder.js","SPM/connector/TrelloConnector":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/CodeInjector.js":[function(require,module,exports){
module.exports = {

    injectFile: function(fileName) {
        var s = document.createElement('script');
        // TODO: add "script.js" to web_accessible_resources in manifest.json
        s.src = chrome.extension.getURL(fileName);
        s.onload = function() {
            this.parentNode.removeChild(this);
        };
        (document.head||document.documentElement).appendChild(s);
    },

    injectCode: function(code) {
        var s = document.createElement('script');
        s.type = 'text/javascript';
        // TODO: add "script.js" to web_accessible_resources in manifest.json
        s.onload = function() {
            this.parentNode.removeChild(this);
        };
        s.appendChild(document.createTextNode(code));
        (document.head||document.documentElement).appendChild(s);

    }
}
},{}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/UrlChanged.js":[function(require,module,exports){
CodeInjector = require('SPM/Utils/CodeInjector');

var UrlChanged = {
    onChanged: function(callback) {
        if ($(".urlchanged").length == 0) {
            this._initialize();
        }
        $(this).on('urlChanged', callback);
    },

    _initialize: function() {
        if ($(".urlchanged").length == 0) {
             $("body").append("<div class='urlchanged'></div>");
        }
        CodeInjector.injectCode('\
            (function(history){\
                var pushState = history.pushState;\
                history.pushState = function(state) {\
                    if (typeof history.onpushstate == "function") {\
                        history.onpushstate({state: state});\
                    }\
                    if ($(".urlchanged").length > 0) {\
                        $(".urlchanged").append("h");\
                    }\
                    \
                    return pushState.apply(history, arguments);\
                }\
            })(window.history);\
        ');


        // select the target node
        var target = document.querySelector('.urlchanged');

        // create an observer instance
        var observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            $(this).trigger('urlChanged');
          }.bind(this));
        }.bind(this));

        // configuration of the observer:
        var config = { attributes: true, childList: true, characterData: true };

        // pass in the target node, as well as the observer options
        observer.observe(target, config);
    }
}

module.exports = UrlChanged;
},{"SPM/Utils/CodeInjector":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/CodeInjector.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/Utils.js":[function(require,module,exports){
module.exports = {
    waitUntil: function(isReady) {
        return new Promise(function(success, error) {
            var timerId
            timerId = setInterval(function() {
                if (isReady()) {
                    clearInterval(timerId);
                    return success();
                }
            }, 100);
        })
    },

    getProjectNameFromUrl: function(url) {
        console.log(url)
        var channel = url.split('/')[4];
        if (channel && channel.substring(0,2) == 'p-') {
            return channel;
        } else {
            return null;
        }
    },

    unaccent: function (s) {
        var accentMap = {
            'ô':'o',
            'é':'e', 'è':'e','ê':'e', 'ë':'e',
            'à': 'a',
            'î':'i', 'ï': 'i',
            'ç':'c'
        };
        return [].map.call(s, function (c) {
            return accentMap[c] || c;
        }).join('')
    },

    parseGetValueFromKey: function(desc, key) {
        var value = desc
            .toLowerCase()
            .match(new RegExp("(\\n|^).*?" + key + ".*?:.*?(\\n|$)"));
        if (!value) {return false}
        return value[0]
            .slice(value[0].indexOf(':') + 1)
            .trim().replace(/^\*+|\*+$/g, '').trim();
    },

    getDueDate: function(date) {
        var diff = moment(date).diff(moment(), 'days');
        if (diff >= 0) {
            return "J-" + diff;
        } else if (diff < 0) {
            return "J+" + Math.abs(diff);
        } else {
            return "";
        }
    },

    doubleLineBreak: function (desc) {
        return desc.replace(/[^\n]\n[^\n]/g, function(str) {
            return str[0] + "\n\n" + str[2];
        }, "g");
    },

    onDomChanged: function(selector, callback) {

        // select the target node
        var target = document.querySelector(selector);

        // create an observer instance
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                callback();
            }.bind(this));
        }.bind(this));

        // configuration of the observer:
        var config = { attributes: false, childList: true, characterData: false };

        // pass in the target node, as well as the observer options
        observer.observe(target, config);
    },

    removeFromArray: function(key, array) {
        var index = array.indexOf(key);
        if (index > -1) {
            array.splice(index, 1);
            return true;
        }
        return false;
    },

    removeFromObject: function(key, object) {
        if (object.hasOwnProperty(key)) {
            delete object[key];
            return true;
        } else {
            return false;
        }
    },

    isArray: function(array) {
        if( Object.prototype.toString.call( array ) === '[object Array]' ) {
            return true;
        } else {
            return false;
        }
    }
}

},{}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/ViewHelpers/MenuSectionViewHelper/MenuSectionRenderer.js":[function(require,module,exports){
var CodeInjector = require('SPM/Utils/CodeInjector.js');
var Utils        = require('SPM/Utils/Utils.js');

module.exports = {

    sections: [],

    addSection: function(id, title, channels, isProjectSection) {
        // First use, initialize
        if (this.sections.length == 0) {
            this._initialize();
        }


        // create object section
        // @todo replace by class
        var section = _.find(this.sections, function(s) { return s.id == id}) || {};
        section.title = title;
        section.isProjectSection = isProjectSection;
        section.channels = channels;
        section.id = id;

        // add it to the sections
        this.sections.push(section);

        // add dom
        this.addSectionDivIfNotExist(section);

        this.updateMenuItem(section);
    },

    _initialize: function() {
        this.initTemplate();
        CodeInjector.injectFile("js/ViewHelpers/MenuSectionViewHelper/menuSectionInjectedCode.js");

        Utils.onDomChanged("#channel-list", function() {
            this.update();
        }.bind(this));
    },

    update: function(section) {
        for (var i = 0 ; i < this.sections.length ; i++) {
            this.updateMenuItem(this.sections[i]);
        }
    },


    addSectionDivIfNotExist: function(section) {
        if ($("#"+section.id).length == 0) {
            var div = '<div id="' + section.id + '" class="SPM-section-added section_holder"></div>';
            var index = 0;
            if ($("#starred_div").length > 0) {
                var index = 1;
            }
            $("#channels_scroller").children().eq(index).before(div);
        }

        this.template.update(section.id, {
            channels: section.channels,
            title: section.title,
            isProjectSection: section.isProjectSection
        });

    },

    updateMenuItem: function(section) {
        $("#" + section.id + " li.channel").each(function(index) {
            var id = $(this).find(".channel_name").attr("data-channel-id");
            if ($(this)[0].outerHTML != $("#channel-list .channel_" + id + ", #starred-list .channel_"+id)[0].outerHTML) {
                $(this).replaceWith($("#channel-list .channel_" + id + ",#starred-list .channel_"+id).clone());
            }
        });
        CodeInjector.injectCode("TS.client.channel_pane.makeSureActiveChannelIsInView();");
    },

    template: null,
    initTemplate: function() {
        if (this.template === null) {
            this.template = new EJS({url: chrome.extension.getURL('js/ViewHelpers/MenuSectionViewHelper/menuSection.ejs')});
        }
    },


}
},{"SPM/Utils/CodeInjector.js":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/CodeInjector.js","SPM/Utils/Utils.js":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/Utils.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/apps/ProjectPanel/views/PanelRenderer.js":[function(require,module,exports){
arguments[4]["/home/johan/projets/trello-slack/js/node_modules/SPM/apps/ProjectPanel/views/PanelRenderer.js"][0].apply(exports,arguments)
},{"SPM/Utils/CodeInjector":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/CodeInjector.js","SPM/Utils/Utils":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/Utils.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js":[function(require,module,exports){
arguments[4]["/home/johan/projets/trello-slack/js/node_modules/SPM/connector/TrelloConnector.js"][0].apply(exports,arguments)
},{}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Model/MemberManager.js":[function(require,module,exports){
arguments[4]["/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/MemberManager.js"][0].apply(exports,arguments)
},{"SPM/connector/TrelloConnector":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Model/Project/ProjectStorage.js":[function(require,module,exports){
arguments[4]["/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/Project/ProjectStorage.js"][0].apply(exports,arguments)
},{"SPM/Utils/Utils.js":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/Utils.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Model/Project/TrelloProjectBuilder.js":[function(require,module,exports){
arguments[4]["/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/Project/TrelloProjectBuilder.js"][0].apply(exports,arguments)
},{"SPM/Utils/Utils.js":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/Utils.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Model/Project/TrelloProjectReader.js":[function(require,module,exports){
arguments[4]["/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/Project/TrelloProjectReader.js"][0].apply(exports,arguments)
},{"SPM/Model/Project/TrelloProjectBuilder":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/node_modules/SPM/Model/Project/TrelloProjectBuilder.js","SPM/connector/TrelloConnector":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/CodeInjector.js":[function(require,module,exports){
arguments[4]["/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/CodeInjector.js"][0].apply(exports,arguments)
},{}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/Utils.js":[function(require,module,exports){
arguments[4]["/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/Utils.js"][0].apply(exports,arguments)
},{}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js":[function(require,module,exports){
arguments[4]["/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js"][0].apply(exports,arguments)
},{}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/node_modules/SPM/Model/Project/TrelloProjectBuilder.js":[function(require,module,exports){
arguments[4]["/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Model/Project/TrelloProjectBuilder.js"][0].apply(exports,arguments)
},{"SPM/Utils/Utils.js":"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/Utils.js"}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/Utils.js":[function(require,module,exports){
arguments[4]["/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/Utils.js"][0].apply(exports,arguments)
},{}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js":[function(require,module,exports){
arguments[4]["/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js"][0].apply(exports,arguments)
},{}],"/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/Utils.js":[function(require,module,exports){
arguments[4]["/home/johan/projets/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/Utils.js"][0].apply(exports,arguments)
},{}]},{},["/home/johan/projets/trello-slack/js/main.js"]);
