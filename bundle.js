(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/home/johan/evaneos/trello-slack/js/main.js":[function(require,module,exports){
var TrelloConnector       = require('SPM/connector/TrelloConnector');
var MemberManager         = require('SPM/Model/MemberManager');
var ProjectManager        = require('SPM/Model/Project/ProjectManager');
var ProjectStorage        = require('SPM/Model/Project/ProjectStorage');
var TrelloProjectReader   = require('SPM/Model/Project/TrelloProjectReader');
var PanelRenderer         = require('SPM/apps/ProjectPanel/views/PanelRenderer');
var PanelInitalizer       = require('SPM/apps/ProjectPanel/PanelInitializer');
var MyProjectsInitializer = require('SPM/apps/MyProjects/MyProjectsInitializer');
var ToggleMenuInitializer = require('SPM/apps/ToggleMenu/ToggleMenuInitializer');


var _boardsIds = {
    arborium: "54b94910f186c08595048a8f",
    seeds: "54b7c3955fdb8e63ba5819d8"
}

var _buildModel = function() {

    ProjectManager.addStorage(ProjectStorage);
    ProjectManager.addStorage(TrelloProjectReader);

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

                return _buildModel.apply(this);
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
    debugger;
    init.init();
}
},{"SPM/Model/MemberManager":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/Model/MemberManager.js","SPM/Model/Project/ProjectManager":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/Model/Project/ProjectManager.js","SPM/Model/Project/ProjectStorage":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/Model/Project/ProjectStorage.js","SPM/Model/Project/TrelloProjectReader":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/Model/Project/TrelloProjectReader.js","SPM/apps/MyProjects/MyProjectsInitializer":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/apps/MyProjects/MyProjectsInitializer.js","SPM/apps/ProjectPanel/PanelInitializer":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/apps/ProjectPanel/PanelInitializer.js","SPM/apps/ProjectPanel/views/PanelRenderer":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/apps/ProjectPanel/views/PanelRenderer.js","SPM/apps/ToggleMenu/ToggleMenuInitializer":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/apps/ToggleMenu/ToggleMenuInitializer.js","SPM/connector/TrelloConnector":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/connector/TrelloConnector.js"}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/Model/MemberManager.js":[function(require,module,exports){
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
},{"SPM/connector/TrelloConnector":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js"}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/Model/Project/ProjectManager.js":[function(require,module,exports){
var MemberManager = require('SPM/Model/MemberManager');

var _storages = [];

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
        i ++;
        if (i == _storages.length) {
            return Promise.reject('nothing in all storages :(');
        }
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

    addStorage: function(storage) {
        _storages.push(storage);
    },

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
},{"SPM/Model/MemberManager":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/MemberManager.js"}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/Model/Project/ProjectStorage.js":[function(require,module,exports){
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
},{"SPM/Utils/Utils.js":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/Utils.js"}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/Model/Project/TrelloProjectReader.js":[function(require,module,exports){
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
},{"SPM/Model/Project/TrelloProjectBuilder":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/Project/TrelloProjectBuilder.js","SPM/connector/TrelloConnector":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js"}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/apps/MyProjects/MyProjectsInitializer.js":[function(require,module,exports){
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
    }).catch(function() {
        console.log('bug in getMyProjectsInBoard');
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
                .catch(function() {
                    console.log('getProjectByChannelName has bugged');
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
        .catch(function() {
            console.log("bug in getting getProjectByChannelName");
        })
}

var _boardsIds = [];

var renderChannels = function() {
    Promise.all([
    // 1 - Get channels by category
        // Promise.resolve(ChannelManager.getNotProjectChannels()),    // Other non project Channels
        getNotMyProjectFollowed()                                         // Project followed, but not member
        // getMyProjectsInBoard(_boardsIds.seeds),              // My project in seed
        // getMyProjectsInBoard(_boardsIds.arborium)            // My projects in arborium
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



},{"SPM/Model/ChannelManager":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/ChannelManager.js","SPM/Model/Project/ProjectManager":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/Project/ProjectManager.js","SPM/Utils/Utils":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/Utils.js","SPM/ViewHelpers/MenuSectionViewHelper/MenuSectionRenderer":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/ViewHelpers/MenuSectionViewHelper/MenuSectionRenderer.js"}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/apps/ProjectPanel/PanelInitializer.js":[function(require,module,exports){
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
},{"SPM/Model/Project/ProjectManager.js":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/Project/ProjectManager.js","SPM/Utils/CodeInjector.js":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/CodeInjector.js","SPM/Utils/UrlChanged.js":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/UrlChanged.js","SPM/Utils/Utils.js":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/Utils.js","SPM/apps/ProjectPanel/views/PanelRenderer.js":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/apps/ProjectPanel/views/PanelRenderer.js"}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/apps/ProjectPanel/views/PanelRenderer.js":[function(require,module,exports){
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
},{"SPM/Utils/CodeInjector":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/CodeInjector.js","SPM/Utils/Utils":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/Utils.js"}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/apps/ToggleMenu/ToggleMenuInitializer.js":[function(require,module,exports){
var CodeInjector = require('SPM/Utils/CodeInjector.js');

module.exports = {
    init: function() {
        CodeInjector.injectFile("js/apps/ToggleMenu/toggleMenuInjectedCode.js");
        return true;
    }
}
},{"SPM/Utils/CodeInjector.js":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/CodeInjector.js"}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/connector/TrelloConnector.js":[function(require,module,exports){
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
},{}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/ChannelManager.js":[function(require,module,exports){
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
},{}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/MemberManager.js":[function(require,module,exports){
arguments[4]["/home/johan/evaneos/trello-slack/js/node_modules/SPM/Model/MemberManager.js"][0].apply(exports,arguments)
},{"SPM/connector/TrelloConnector":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js"}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/Project/ProjectManager.js":[function(require,module,exports){
arguments[4]["/home/johan/evaneos/trello-slack/js/node_modules/SPM/Model/Project/ProjectManager.js"][0].apply(exports,arguments)
},{"SPM/Model/MemberManager":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Model/MemberManager.js"}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/Project/TrelloProjectBuilder.js":[function(require,module,exports){
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
},{"SPM/Utils/Utils.js":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/Utils.js"}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/CodeInjector.js":[function(require,module,exports){
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
},{}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/UrlChanged.js":[function(require,module,exports){
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
},{"SPM/Utils/CodeInjector":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/CodeInjector.js"}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/Utils.js":[function(require,module,exports){
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

},{}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/ViewHelpers/MenuSectionViewHelper/MenuSectionRenderer.js":[function(require,module,exports){
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
},{"SPM/Utils/CodeInjector.js":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/CodeInjector.js","SPM/Utils/Utils.js":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/Utils.js"}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/apps/ProjectPanel/views/PanelRenderer.js":[function(require,module,exports){
arguments[4]["/home/johan/evaneos/trello-slack/js/node_modules/SPM/apps/ProjectPanel/views/PanelRenderer.js"][0].apply(exports,arguments)
},{"SPM/Utils/CodeInjector":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/CodeInjector.js","SPM/Utils/Utils":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/Utils.js"}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js":[function(require,module,exports){
arguments[4]["/home/johan/evaneos/trello-slack/js/node_modules/SPM/connector/TrelloConnector.js"][0].apply(exports,arguments)
},{}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Model/MemberManager.js":[function(require,module,exports){
arguments[4]["/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Model/MemberManager.js"][0].apply(exports,arguments)
},{"SPM/connector/TrelloConnector":"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js"}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/CodeInjector.js":[function(require,module,exports){
arguments[4]["/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/CodeInjector.js"][0].apply(exports,arguments)
},{}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/Utils/Utils.js":[function(require,module,exports){
arguments[4]["/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/Utils/Utils.js"][0].apply(exports,arguments)
},{}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js":[function(require,module,exports){
arguments[4]["/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js"][0].apply(exports,arguments)
},{}],"/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js":[function(require,module,exports){
arguments[4]["/home/johan/evaneos/trello-slack/js/node_modules/SPM/node_modules/SPM/node_modules/SPM/connector/TrelloConnector.js"][0].apply(exports,arguments)
},{}]},{},["/home/johan/evaneos/trello-slack/js/main.js"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9tYWluLmpzIiwianMvbm9kZV9tb2R1bGVzL1NQTS9Nb2RlbC9NZW1iZXJNYW5hZ2VyLmpzIiwianMvbm9kZV9tb2R1bGVzL1NQTS9Nb2RlbC9Qcm9qZWN0L1Byb2plY3RNYW5hZ2VyLmpzIiwianMvbm9kZV9tb2R1bGVzL1NQTS9Nb2RlbC9Qcm9qZWN0L1Byb2plY3RTdG9yYWdlLmpzIiwianMvbm9kZV9tb2R1bGVzL1NQTS9Nb2RlbC9Qcm9qZWN0L1RyZWxsb1Byb2plY3RSZWFkZXIuanMiLCJqcy9ub2RlX21vZHVsZXMvU1BNL2FwcHMvTXlQcm9qZWN0cy9NeVByb2plY3RzSW5pdGlhbGl6ZXIuanMiLCJqcy9ub2RlX21vZHVsZXMvU1BNL2FwcHMvUHJvamVjdFBhbmVsL1BhbmVsSW5pdGlhbGl6ZXIuanMiLCJqcy9ub2RlX21vZHVsZXMvU1BNL2FwcHMvUHJvamVjdFBhbmVsL3ZpZXdzL1BhbmVsUmVuZGVyZXIuanMiLCJqcy9ub2RlX21vZHVsZXMvU1BNL2FwcHMvVG9nZ2xlTWVudS9Ub2dnbGVNZW51SW5pdGlhbGl6ZXIuanMiLCJqcy9ub2RlX21vZHVsZXMvU1BNL2Nvbm5lY3Rvci9UcmVsbG9Db25uZWN0b3IuanMiLCJqcy9ub2RlX21vZHVsZXMvU1BNL25vZGVfbW9kdWxlcy9TUE0vTW9kZWwvQ2hhbm5lbE1hbmFnZXIuanMiLCJqcy9ub2RlX21vZHVsZXMvU1BNL25vZGVfbW9kdWxlcy9TUE0vTW9kZWwvTWVtYmVyTWFuYWdlci5qcyIsImpzL25vZGVfbW9kdWxlcy9TUE0vbm9kZV9tb2R1bGVzL1NQTS9Nb2RlbC9Qcm9qZWN0L1Byb2plY3RNYW5hZ2VyLmpzIiwianMvbm9kZV9tb2R1bGVzL1NQTS9ub2RlX21vZHVsZXMvU1BNL01vZGVsL1Byb2plY3QvVHJlbGxvUHJvamVjdEJ1aWxkZXIuanMiLCJqcy9ub2RlX21vZHVsZXMvU1BNL25vZGVfbW9kdWxlcy9TUE0vVXRpbHMvQ29kZUluamVjdG9yLmpzIiwianMvbm9kZV9tb2R1bGVzL1NQTS9ub2RlX21vZHVsZXMvU1BNL1V0aWxzL1VybENoYW5nZWQuanMiLCJqcy9ub2RlX21vZHVsZXMvU1BNL25vZGVfbW9kdWxlcy9TUE0vVXRpbHMvVXRpbHMuanMiLCJqcy9ub2RlX21vZHVsZXMvU1BNL25vZGVfbW9kdWxlcy9TUE0vVmlld0hlbHBlcnMvTWVudVNlY3Rpb25WaWV3SGVscGVyL01lbnVTZWN0aW9uUmVuZGVyZXIuanMiLCJqcy9ub2RlX21vZHVsZXMvU1BNL25vZGVfbW9kdWxlcy9TUE0vYXBwcy9Qcm9qZWN0UGFuZWwvdmlld3MvUGFuZWxSZW5kZXJlci5qcyIsImpzL25vZGVfbW9kdWxlcy9TUE0vbm9kZV9tb2R1bGVzL1NQTS9jb25uZWN0b3IvVHJlbGxvQ29ubmVjdG9yLmpzIiwianMvbm9kZV9tb2R1bGVzL1NQTS9ub2RlX21vZHVsZXMvU1BNL25vZGVfbW9kdWxlcy9TUE0vTW9kZWwvTWVtYmVyTWFuYWdlci5qcyIsImpzL25vZGVfbW9kdWxlcy9TUE0vbm9kZV9tb2R1bGVzL1NQTS9ub2RlX21vZHVsZXMvU1BNL1V0aWxzL0NvZGVJbmplY3Rvci5qcyIsImpzL25vZGVfbW9kdWxlcy9TUE0vbm9kZV9tb2R1bGVzL1NQTS9ub2RlX21vZHVsZXMvU1BNL1V0aWxzL1V0aWxzLmpzIiwianMvbm9kZV9tb2R1bGVzL1NQTS9ub2RlX21vZHVsZXMvU1BNL25vZGVfbW9kdWxlcy9TUE0vY29ubmVjdG9yL1RyZWxsb0Nvbm5lY3Rvci5qcyIsImpzL25vZGVfbW9kdWxlcy9TUE0vbm9kZV9tb2R1bGVzL1NQTS9ub2RlX21vZHVsZXMvU1BNL25vZGVfbW9kdWxlcy9TUE0vY29ubmVjdG9yL1RyZWxsb0Nvbm5lY3Rvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBOztBQ0FBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTs7QUNBQTs7QUNBQTs7QUNBQTs7QUNBQTs7QUNBQTs7QUNBQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgVHJlbGxvQ29ubmVjdG9yICAgICAgID0gcmVxdWlyZSgnU1BNL2Nvbm5lY3Rvci9UcmVsbG9Db25uZWN0b3InKTtcbnZhciBNZW1iZXJNYW5hZ2VyICAgICAgICAgPSByZXF1aXJlKCdTUE0vTW9kZWwvTWVtYmVyTWFuYWdlcicpO1xudmFyIFByb2plY3RNYW5hZ2VyICAgICAgICA9IHJlcXVpcmUoJ1NQTS9Nb2RlbC9Qcm9qZWN0L1Byb2plY3RNYW5hZ2VyJyk7XG52YXIgUHJvamVjdFN0b3JhZ2UgICAgICAgID0gcmVxdWlyZSgnU1BNL01vZGVsL1Byb2plY3QvUHJvamVjdFN0b3JhZ2UnKTtcbnZhciBUcmVsbG9Qcm9qZWN0UmVhZGVyICAgPSByZXF1aXJlKCdTUE0vTW9kZWwvUHJvamVjdC9UcmVsbG9Qcm9qZWN0UmVhZGVyJyk7XG52YXIgUGFuZWxSZW5kZXJlciAgICAgICAgID0gcmVxdWlyZSgnU1BNL2FwcHMvUHJvamVjdFBhbmVsL3ZpZXdzL1BhbmVsUmVuZGVyZXInKTtcbnZhciBQYW5lbEluaXRhbGl6ZXIgICAgICAgPSByZXF1aXJlKCdTUE0vYXBwcy9Qcm9qZWN0UGFuZWwvUGFuZWxJbml0aWFsaXplcicpO1xudmFyIE15UHJvamVjdHNJbml0aWFsaXplciA9IHJlcXVpcmUoJ1NQTS9hcHBzL015UHJvamVjdHMvTXlQcm9qZWN0c0luaXRpYWxpemVyJyk7XG52YXIgVG9nZ2xlTWVudUluaXRpYWxpemVyID0gcmVxdWlyZSgnU1BNL2FwcHMvVG9nZ2xlTWVudS9Ub2dnbGVNZW51SW5pdGlhbGl6ZXInKTtcblxuXG52YXIgX2JvYXJkc0lkcyA9IHtcbiAgICBhcmJvcml1bTogXCI1NGI5NDkxMGYxODZjMDg1OTUwNDhhOGZcIixcbiAgICBzZWVkczogXCI1NGI3YzM5NTVmZGI4ZTYzYmE1ODE5ZDhcIlxufVxuXG52YXIgX2J1aWxkTW9kZWwgPSBmdW5jdGlvbigpIHtcblxuICAgIFByb2plY3RNYW5hZ2VyLmFkZFN0b3JhZ2UoUHJvamVjdFN0b3JhZ2UpO1xuICAgIFByb2plY3RNYW5hZ2VyLmFkZFN0b3JhZ2UoVHJlbGxvUHJvamVjdFJlYWRlcik7XG5cbiAgICByZXR1cm4gVHJlbGxvUHJvamVjdFJlYWRlci5zZXRCb2FyZHMoX2JvYXJkc0lkcyk7XG59O1xuXG52YXIgaW5pdCA9IHtcblxuICAgIC8qKlxuICAgICogTGV0J3MgZ28hXG4gICAgKi9cbiAgICBjdXJyZW50UHJvamVjdE5hbWU6IG51bGwsXG4gICAgZGF0ZTogbW9tZW50KCksXG4gICAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIFRyZWxsb0Nvbm5lY3RvclxuICAgICAgICAgICAgLmluaXRDb25uZWN0aW9uKClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBNZW1iZXJNYW5hZ2VyLnNldE1lKCk7XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgICAgIHJldHVybiBfYnVpbGRNb2RlbC5hcHBseSh0aGlzKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBQYW5lbFJlbmRlcmVyLnNldEJvYXJkcyhUcmVsbG9Qcm9qZWN0UmVhZGVyLmdldEJvYXJkcygpKTtcbiAgICAgICAgICAgICAgICBQYW5lbEluaXRhbGl6ZXIuaW5pdCgpO1xuICAgICAgICAgICAgICAgIE15UHJvamVjdHNJbml0aWFsaXplci5zZXRCb2FyZElkcyhfYm9hcmRzSWRzKTtcbiAgICAgICAgICAgICAgICBNeVByb2plY3RzSW5pdGlhbGl6ZXIuaW5pdCgpO1xuICAgICAgICAgICAgICAgIFRvZ2dsZU1lbnVJbml0aWFsaXplci5pbml0KCk7XG5cbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgdmFyIG15RmlyZWJhc2VSZWYgPSBuZXcgRmlyZWJhc2UoXCJodHRwczovL3RyZWxsby5maXJlYmFzZWlvLmNvbS9cIik7XG4gICAgICAgIG15RmlyZWJhc2VSZWYuY2hpbGQoXCJwcm9qZWN0c1wiKVxuICAgICAgICAub24oXCJjaGlsZF9hZGRlZFwiLCBmdW5jdGlvbihzbmFwc2hvdCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGUoc25hcHNob3QudmFsKCkuaWQsIHNuYXBzaG90LnZhbCgpLnVwZGF0ZWRfYXQpO1xuICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICBteUZpcmViYXNlUmVmLmNoaWxkKFwicHJvamVjdHNcIilcbiAgICAgICAgLm9uKFwiY2hpbGRfY2hhbmdlZFwiLCBmdW5jdGlvbihzbmFwc2hvdCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGUoc25hcHNob3QudmFsKCkuaWQsIHNuYXBzaG90LnZhbCgpLnVwZGF0ZWRfYXQpO1xuICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgIH0sXG4gICAgdXBkYXRlOiBmdW5jdGlvbihpZCwgZGF0ZSkge1xuICAgICAgICBpZiAodGhpcy5kYXRlLmlzQmVmb3JlKG1vbWVudChkYXRlKSkpIHtcbiAgICAgICAgICAgIFByb2plY3RNYW5hZ2VyLnVwZGF0ZVByb2plY3RCeUlkKGlkKS50aGVuKGZ1bmN0aW9uKHByb2plY3QpIHtcbiAgICAgICAgICAgICAgICBQYW5lbEluaXRhbGl6ZXIudXBkYXRlUHJvamVjdChwcm9qZWN0KTtcbiAgICAgICAgICAgICAgICBNeVByb2plY3RzSW5pdGlhbGl6ZXIudXBkYXRlUHJvamVjdChwcm9qZWN0KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICBkZWJ1Z2dlcjtcbiAgICBpbml0LmluaXQoKTtcbn0iLCJ2YXIgY29ubmVjdG9yID0gcmVxdWlyZSgnU1BNL2Nvbm5lY3Rvci9UcmVsbG9Db25uZWN0b3InKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbWU6IG51bGwsXG4gICAgc2V0TWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oc3VjY2VzcywgZXJyb3Ipe1xuICAgICAgICAgICAgaWYgKHRoaXMubWUgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbm5lY3Rvci5yZXF1ZXN0KFwiZ2V0XCIsXCIvbWVtYmVycy9tZVwiKS50aGVuKGZ1bmN0aW9uKG1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWUgPSBtZTtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzcygpO1xuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIH1cbn07IiwidmFyIE1lbWJlck1hbmFnZXIgPSByZXF1aXJlKCdTUE0vTW9kZWwvTWVtYmVyTWFuYWdlcicpO1xuXG52YXIgX3N0b3JhZ2VzID0gW107XG5cbnZhciBfZ2V0RnJvbVN0b3JhZ2VJID0gZnVuY3Rpb24obWV0aG9kTmFtZSwgYXJncywgaSkge1xuICAgIGlmICh0eXBlb2YgX3N0b3JhZ2VzW2ldID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdCgnc3RvcmFnZSAnICsgaSArICcgbm90IGRlZmluZWQnKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBfc3RvcmFnZXNbaV1bbWV0aG9kTmFtZV0gPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KCd0aGUgbWV0aG9kICcgKyBtZXRob2ROYW1lICsgJyBpcyBub3QgZGVmaW5lZCBmb3IgdGhlICcgKyBpICsgJ3RoIHN0b3JhZ2UnKTtcbiAgICB9XG4gICAgcmV0dXJuIF9zdG9yYWdlc1tpXVttZXRob2ROYW1lXS5hcHBseShfc3RvcmFnZXNbaV0sIGFyZ3MpO1xufVxuXG52YXIgX2dldEZyb21TdG9yYWdlID0gZnVuY3Rpb24obWV0aG9kTmFtZSwgYXJncywgaSkge1xuICAgIGlmICh0eXBlb2YgaSA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBpID0gMDtcbiAgICB9XG4gICAgIC8vIEB0b2RvIGV4ZWN1dGUgbWV0aG9kIHdpdGggYXJnc1xuICAgIHJldHVybiBfZ2V0RnJvbVN0b3JhZ2VJKG1ldGhvZE5hbWUsIGFyZ3MsIGkpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgIHJldHVybiBfdXBkYXRlUHJldmlvdXNDYWNoZShpLCByZXN1bHQsIG1ldGhvZE5hbWUsIGFyZ3MpLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9KTtcbiAgICB9LmJpbmQodGhpcykpXG4gICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaSArKztcbiAgICAgICAgaWYgKGkgPT0gX3N0b3JhZ2VzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KCdub3RoaW5nIGluIGFsbCBzdG9yYWdlcyA6KCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBfZ2V0RnJvbVN0b3JhZ2UobWV0aG9kTmFtZSwgYXJncywgaSk7XG4gICAgfS5iaW5kKHRoaXMpKVxufVxuXG52YXIgX3VwZGF0ZVByZXZpb3VzQ2FjaGUgPSBmdW5jdGlvbihuLCByZXN1bHQsIG1ldGhvZE5hbWUsIGFyZ3MpIHtcbiAgICBpZiAobi0xID4gMCkge1xuICAgICAgICBmb3IgKHZhciBpID0gbiAtIDEgOyBpID49IDAgOyBpIC0tKSB7XG4gICAgICAgICAgICB0aGlzLl9zdG9yYWdlc1tpXS5zYXZlUmVzdWx0KHJlc3VsdCwgbWV0aG9kTmFtZSwgYXJncyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXN1bHQpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIGFkZFN0b3JhZ2U6IGZ1bmN0aW9uKHN0b3JhZ2UpIHtcbiAgICAgICAgX3N0b3JhZ2VzLnB1c2goc3RvcmFnZSk7XG4gICAgfSxcblxuICAgIGlzTXlQcm9qZWN0OiBmdW5jdGlvbihwcm9qZWN0KSB7XG4gICAgICAgIHJldHVybiBfLmZpbmQocHJvamVjdC5tZW1iZXJzLCBmdW5jdGlvbihtZW1iZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBNZW1iZXJNYW5hZ2VyLm1lLmlkID09IG1lbWJlci5pZDtcbiAgICAgICAgfSlcbiAgICB9LFxuXG4gICAgZ2V0TXlQcm9qZWN0czogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gX2dldEZyb21TdG9yYWdlKFwiZ2V0TXlQcm9qZWN0c1wiLCBbXSk7XG4gICAgfSxcblxuICAgIGdldFByb2plY3RCeUNoYW5uZWxOYW1lOiBmdW5jdGlvbiAoY2hhbm5lbE5hbWUpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRGcm9tU3RvcmFnZShcImdldFByb2plY3RCeUNoYW5uZWxOYW1lXCIsIFtjaGFubmVsTmFtZV0pO1xuICAgIH0sXG5cbiAgICB1cGRhdGVQcm9qZWN0QnlJZDogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRGcm9tU3RvcmFnZShcImdldEJ5SWRcIiwgW2lkXSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocHJvamVjdCkge1xuICAgICAgICAgICAgcmV0dXJuIF9nZXRGcm9tU3RvcmFnZShcInJlbW92ZVByb2pldFwiLCBbcHJvamVjdF0pXG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIF9nZXRGcm9tU3RvcmFnZShcImdldEJ5SWRcIiwgW2lkXSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBnZXRCeUlkOiBmdW5jdGlvbihpZCkge1xuICAgICAgICByZXR1cm4gX2dldEZyb21TdG9yYWdlKFwiZ2V0QnlJZFwiLCBbaWRdKTtcbiAgICB9XG59IiwidmFyIFV0aWxzID0gcmVxdWlyZSgnU1BNL1V0aWxzL1V0aWxzLmpzJyk7XG5cbnZhciBfcHJvamVjdHMgPSB7fTtcbnZhciBfcHJvamVjdHNCeUNoYW5uZWwgPSB7fTtcbnZhciBfcHJvamVjdHNCeVVzZXIgPSB7fTtcbnZhciBfcHJvamVjdHNCeVNlYXJjaCA9IHt9O1xudmFyIF9tZSA9IG51bGw7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNldE1lOiBmdW5jdGlvbihtZSkge1xuICAgICAgICBfbWUgPSBtZTtcbiAgICB9LFxuXG4gICAgc2V0VXRpbHM6IGZ1bmN0aW9uKHV0aWxzKSB7XG4gICAgICAgIF91dGlscyA9IHV0aWxzO1xuICAgIH0sXG5cblx0c2F2ZVByb2plY3Q6IGZ1bmN0aW9uKHByb2plY3QpIHtcblx0XHRfcHJvamVjdHNbcHJvamVjdC5pZF0gPSBwcm9qZWN0O1xuXHRcdGlmIChwcm9qZWN0LnNsYWNrKSB7XG5cdFx0XHRfcHJvamVjdHNCeUNoYW5uZWxbcHJvamVjdC5zbGFja10gPSBwcm9qZWN0LmlkO1xuXHRcdH1cbiAgICAgICAgaWYgKHByb2plY3QubWVtYmVycykge1xuICAgICAgICAgICAgXy5tYXAocHJvamVjdC5tZW1iZXJzLCBmdW5jdGlvbihtZW1iZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIF9wcm9qZWN0c0J5VXNlclttZW1iZXIuaWRdID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIF9wcm9qZWN0c0J5VXNlclttZW1iZXIuaWRdID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF9wcm9qZWN0c0J5VXNlclttZW1iZXIuaWRdLnB1c2gocHJvamVjdCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcm9qZWN0O1xuICAgIH0sXG5cbiAgICByZW1vdmVQcm9qZXQ6IGZ1bmN0aW9uKHByb2plY3QpIHtcbiAgICAgICAgaWYgKF91dGlscy5yZW1vdmVGcm9tT2JqZWN0KHByb2plY3QuaWQsIF9wcm9qZWN0cykpIHtcbiAgICAgICAgICAgIGlmIChwcm9qZWN0LnNsYWNrKSB7XG4gICAgICAgICAgICAgICAgX3V0aWxzLnJlbW92ZUZyb21PYmplY3QocHJvamVjdC5zbGFjaywgX3Byb2plY3RzQnlDaGFubmVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9qZWN0Lm1lbWJlcnMpIHtcbiAgICAgICAgICAgICAgICBfLm1hcChwcm9qZWN0Lm1lbWJlcnMsIGZ1bmN0aW9uKG1lbWJlcikge1xuICAgICAgICAgICAgICAgICAgICBfdXRpbHMucmVtb3ZlRnJvbU9iamVjdChtZW1iZXIuaWQsIF9wcm9qZWN0c0J5VXNlcik7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocHJvamVjdCk7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdCgnbm90IGhlcmUnKTtcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgc2F2ZVByb2plY3RzOiBmdW5jdGlvbiAocHJvamVjdHMpIHtcbiAgICAgIHByb2plY3RzLmZvckVhY2goZnVuY3Rpb24gKHByb2plY3QpIHtcbiAgICAgICAgIHRoaXMuc2F2ZVByb2plY3QocHJvamVjdCk7XG4gICAgIH0uYmluZCh0aGlzKSlcbiAgICAgIHJldHVybiBwcm9qZWN0cztcbiAgICB9LFxuXG4gICAgc2VhcmNoUHJvamVjdDogZnVuY3Rpb24oc2VhcmNoKSB7XG4gICAgICAgIHZhciBwcm9qZWN0SWQgPSBfcHJvamVjdHNCeVNlYXJjaFtzZWFyY2hdXG4gICAgICAgIHJldHVybiAocHJvamVjdElkID09PSB1bmRlZmluZWQpP1xuICAgICAgICBQcm9taXNlLnJlamVjdChcIk5vIGRhdGFcIik6XG4gICAgICAgIFByb21pc2UucmVzb2x2ZShfcHJvamVjdHNbcHJvamVjdElkXSk7XG4gICAgfSxcblxuICAgIGdldFByb2plY3RzQnlVc2VyOiBmdW5jdGlvbiAodXNlcikge1xuICAgICAgICB2YXIgcHJvamVjdHMgPSBfLmZpbHRlcihfcHJvamVjdHMsIGZ1bmN0aW9uKHByb2plY3QpIHtcbiAgICAgICAgICAgIHJldHVybiBfLmZpbmQocHJvamVjdC5tZW1iZXJzLCBmdW5jdGlvbihtZW1iZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWVtYmVyLmlkID09IHVzZXIuaWQ7XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICBpZiAocHJvamVjdHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShwcm9qZWN0cyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoXCJObyBkYXRhXCIpXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZ2V0TXlQcm9qZWN0czogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFByb2plY3RzQnlVc2VyKF9tZSk7XG4gICAgfSxcblxuICAgIG5vUHJvamVjdEZvckNoYW5uZWw6IGZ1bmN0aW9uIChjaGFubmVsTmFtZSkge1xuICAgICAgX3Byb2plY3RzQnlDaGFubmVsW2NoYW5uZWxOYW1lXSA9IGZhbHNlO1xuICAgIH0sXG5cbiAgICBub1Byb2plY3RGb3JVc2VyOiBmdW5jdGlvbiAodXNlcikge1xuICAgICAgICBfcHJvamVjdHNCeVVzZXJbdXNlci5pZF0gPSBmYWxzZTtcbiAgICB9LFxuXG4gICAgZ2V0UHJvamVjdEJ5Q2hhbm5lbE5hbWU6IGZ1bmN0aW9uIChjaGFubmVsTmFtZSkge1xuICAgICAgdmFyIHByb2plY3RJZCA9IF9wcm9qZWN0c0J5Q2hhbm5lbFtjaGFubmVsTmFtZV1cbiAgICAgIHJldHVybiAocHJvamVjdElkID09PSB1bmRlZmluZWQpP1xuICAgICAgUHJvbWlzZS5yZWplY3QoXCJObyBkYXRhXCIpOlxuICAgICAgUHJvbWlzZS5yZXNvbHZlKF9wcm9qZWN0c1twcm9qZWN0SWRdKTtcbiAgICB9LFxuXG4gICAgc2F2ZVJlc3VsdDogZnVuY3Rpb24ocmVzdWx0LCBtZXRob2ROYW1lLCBhcmd1bWVudHMpIHtcbiAgICAgICAgaWYgKFV0aWxzLmlzQXJyYXkocmVzdWx0KSkge1xuICAgICAgICAgICAgdGhpcy5zYXZlUHJvamVjdHMocmVzdWx0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2F2ZVByb2plY3QocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuXG4gICAgZ2V0QnlJZDogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBfcHJvamVjdHNbaWRdICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKF9wcm9qZWN0c1tpZF0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KCdub3QgaGVyZScpO1xuICAgICAgICB9XG5cbiAgICB9XG59IiwidmFyIGNvbm5lY3RvciAgICAgID0gcmVxdWlyZSgnU1BNL2Nvbm5lY3Rvci9UcmVsbG9Db25uZWN0b3InKTtcbnZhciBwcm9qZWN0QnVpbGRlciA9IHJlcXVpcmUoJ1NQTS9Nb2RlbC9Qcm9qZWN0L1RyZWxsb1Byb2plY3RCdWlsZGVyJyk7XG5cblxudmFyIF9ib2FyZHMgPSBbXTtcblxudmFyIGluaXRMaXN0cyA9IGZ1bmN0aW9uIChib2FyZCkge1xuICAgIHJldHVybiBjb25uZWN0b3IucmVxdWVzdChcImdldFwiLCBcImJvYXJkcy9cIiArIGJvYXJkLmlkICsgXCIvbGlzdHNcIilcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGxpc3RzKSB7XG4gICAgICAgICAgICBib2FyZC5saXN0cyA9IGxpc3RzO1xuICAgICAgICAgICAgcmV0dXJuIGJvYXJkO1xuICAgICAgICB9KTtcbn07XG5cbnZhciBpc1JlZ2lzdHJlZEJvYXJkSWQgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICByZXR1cm4gX2JvYXJkcy5zb21lKGZ1bmN0aW9uIChib2FyZCkge1xuICAgICAgICByZXR1cm4gYm9hcmQuaWQgPT09IGlkO1xuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICBzZXRCb2FyZHM6IGZ1bmN0aW9uKGJvYXJkSWRzKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlXG4gICAgICAgIC8vIDEtIEdldHRpbmcgYWxsIHRoZSBib2FyZHNcbiAgICAgICAgLmFsbChfLm1hcChib2FyZElkcywgZnVuY3Rpb24oYm9hcmRJZCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbm5lY3Rvci5yZXF1ZXN0KFwiYm9hcmRzLmdldFwiLCBib2FyZElkKTtcbiAgICAgICAgfSkpXG4gICAgICAgIC8vIDIgLSBHZXR0aW4nIGFsbCB0aGUgbGlzdCBmb3IgYWxsIHRoZSBib2FyZHNcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGJvYXJkcykge1xuICAgICAgICAgICAgX2JvYXJkcyA9IGJvYXJkcztcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChib2FyZHMubWFwKGZ1bmN0aW9uIChib2FyZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpbml0TGlzdHMoYm9hcmQpO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgZ2V0Qm9hcmRzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF9ib2FyZHM7XG4gICAgfSxcblxuICAgIHNlYXJjaFByb2plY3Q6IGZ1bmN0aW9uKHF1ZXJ5KSB7XG4gICAgICAgIHJldHVybiBjb25uZWN0b3IucmVxdWVzdChcImdldFwiLFwiL3NlYXJjaFwiLCB7XG4gICAgICAgICAgICBcInF1ZXJ5XCI6ICdcIicrcXVlcnkrJ1wiJyxcbiAgICAgICAgICAgIFwiaWRPcmdhbml6YXRpb25zXCI6IF8ubWFwKHRoaXMuX2JvYXJkcywgZnVuY3Rpb24oYm9hcmQpIHtyZXR1cm4gYm9hcmQuaWRPcmdhbml6YXRpb259KSxcbiAgICAgICAgICAgIFwiaWRCb2FyZHNcIiA6IF8ubWFwKHRoaXMuX2JvYXJkcywgZnVuY3Rpb24oYm9hcmQpIHtyZXR1cm4gYm9hcmQuaWR9KSxcbiAgICAgICAgICAgIFwibW9kZWxUeXBlc1wiOiBcImNhcmRzXCIsXG4gICAgICAgICAgICBcImNhcmRfbWVtYmVyc1wiOiB0cnVlXG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICAgICAgdmFyIGNhcmRzID0gcmVzdWx0LmNhcmRzO1xuXG4gICAgICAgICAgICAvLyByZW1vdmUgYXJjaGl2ZWQgcHJvamVjdFxuICAgICAgICAgICAgY2FyZHMgPSBfLmZpbHRlcihjYXJkcywgZnVuY3Rpb24ocHJvamVjdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhcHJvamVjdC5jbG9zZWQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBjYXJkO1xuICAgICAgICAgICAgaWYgKCEgY2FyZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2FyZCA9IG51bGw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhcmRzLmZvckVhY2goZnVuY3Rpb24gKGNhcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvamVjdEJ1aWxkZXIuYnVpbGQoY2FyZCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGNhcmRzKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICB9LFxuXG4gICAgZ2V0QnlJZDogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgcmV0dXJuIGNvbm5lY3Rvci5yZXF1ZXN0KFwiY2FyZHMuZ2V0XCIsIGlkLCB7XG4gICAgICAgICAgICBcIm1lbWJlcnNcIjogdHJ1ZSxcbiAgICAgICAgICAgIFwiZmlsdGVyXCI6IFwib3BlblwiXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNhcmQpIHtcbiAgICAgICAgICAgIC8vIGZpbHRlciBjYXJkcyB0byBrZWVwIG9ubHkgdGhlIG9uZSBpbiB0aGUgb3JnYSBib2FyZFxuICAgICAgICAgICAgcHJvamVjdEJ1aWxkZXIuYnVpbGQoY2FyZCk7XG4gICAgICAgICAgICByZXR1cm4gY2FyZDtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGdldE15UHJvamVjdHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGNvbm5lY3Rvci5yZXF1ZXN0KFwiZ2V0XCIsIFwiL21lbWJlcnMvbWUvY2FyZHNcIiwge1xuICAgICAgICAgICAgXCJtZW1iZXJzXCI6IHRydWUsXG4gICAgICAgICAgICBcImZpbHRlclwiOiBcIm9wZW5cIixcbiAgICAgICAgICAgIFwibGltaXRcIjogMTAwMFxuICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChjYXJkcykge1xuICAgICAgICAgICAgLy8gZmlsdGVyIGNhcmRzIHRvIGtlZXAgb25seSB0aGUgb25lIGluIHRoZSBvcmdhIGJvYXJkXG4gICAgICAgICAgICBjYXJkcyA9IGNhcmRzXG4gICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAoY2FyZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXNSZWdpc3RyZWRCb2FyZElkKGNhcmQuaWRCb2FyZCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAubWFwKHByb2plY3RCdWlsZGVyLmJ1aWxkKTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoY2FyZHMpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIm5vIGRhdGEgZ2V0TXlQcm9qZWN0c1wiKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGdldFByb2plY3RCeUNoYW5uZWxOYW1lOiBmdW5jdGlvbiAoY2hhbm5lbE5hbWUpIHtcblxuICAgICAgICByZXR1cm4gdGhpcy5zZWFyY2hQcm9qZWN0KGNoYW5uZWxOYW1lKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHByb2plY3RzKSB7XG4gICAgICAgICAgICAgICAgcHJvamVjdHMgPSBwcm9qZWN0cy5maWx0ZXIoZnVuY3Rpb24gKHByb2plY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb2plY3Quc2xhY2sgPT0gY2hhbm5lbE5hbWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHByb2plY3RzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiTW9yZSB0aGFuIG9uZSBUcmVsbG8gY2FyZHMgZm91bmQgZm9yIHRoZSBwcm9qZWN0IFwiICsgY2hhbm5lbE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICBfLm1hcChwcm9qZWN0cywgZnVuY3Rpb24ocHJvamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdC5lcnJvcnMubW9yZVRoYW5PbmVUcmVsbG9DYXJkID0gcHJvamVjdHM7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAvLyBAdG9kbyBzb3J0IGJ5IGNyZWF0ZWRfYXQgZGF0ZSBERVNDXG4gICAgICAgICAgICAgICAgICAgIHByb2plY3QgPSBwcm9qZWN0c1swXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHByb2plY3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJObyBUcmVsbG8gY2FyZHMgZm91bmQgZm9yIHRoZSBwcm9qZWN0IFwiICsgY2hhbm5lbE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICBwcm9qZWN0cyA9IG51bGw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvamVjdCA9IHByb2plY3RzWzBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvamVjdDtcbiAgICAgICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBzYXZlUmVzdWx0OiBmdW5jdGlvbihyZXN1bHQsIG1ldGhvZE5hbWUsIGFyZ3VtZW50cykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlUHJvamV0OiBmdW5jdGlvbihwcm9qZWN0KSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocHJvamVjdCk7XG4gICAgfVxufSIsInZhciBVdGlscyAgICAgICAgICAgPSByZXF1aXJlKCdTUE0vVXRpbHMvVXRpbHMnKTtcbnZhciBDaGFubmVsTWFuYWdlciAgPSByZXF1aXJlKCdTUE0vTW9kZWwvQ2hhbm5lbE1hbmFnZXInKTtcbnZhciBQcm9qZWN0TWFuYWdlciAgPSByZXF1aXJlKCdTUE0vTW9kZWwvUHJvamVjdC9Qcm9qZWN0TWFuYWdlcicpO1xudmFyIFNlY3Rpb25SZW5kZXJlciA9IHJlcXVpcmUoJ1NQTS9WaWV3SGVscGVycy9NZW51U2VjdGlvblZpZXdIZWxwZXIvTWVudVNlY3Rpb25SZW5kZXJlcicpO1xuXG52YXIgbnVtYmVyT2ZQcm9qZWN0cyA9IDA7XG5cbnZhciB3YWl0VW50aWxDaGFubmVsc0FyZUhlcmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gVXRpbHMud2FpdFVudGlsKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbnVtYmVyT2ZQcm9qZWN0cyAhPSAkKFwiI2NoYW5uZWwtbGlzdCBsaVwiKS5sZW5ndGg7XG4gICAgfSk7XG59O1xuXG52YXIgZ2V0TXlQcm9qZWN0c0luQm9hcmQgPSBmdW5jdGlvbihib2FyZElkKSB7XG4gICAgcmV0dXJuIFByb2plY3RNYW5hZ2VyLmdldE15UHJvamVjdHMoKS50aGVuKGZ1bmN0aW9uIChwcm9qZWN0cykge1xuICAgICAgICByZXR1cm4gcHJvamVjdHNcbiAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKHByb2plY3QpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvamVjdC5pZEJvYXJkID09IGJvYXJkSWQ7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm1hcChmdW5jdGlvbiAocHJvamVjdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBDaGFubmVsTWFuYWdlci5jcmVhdGVDaGFubmVsKHByb2plY3QpO1xuICAgICAgICAgICAgfSlcbiAgICB9KS5jYXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2J1ZyBpbiBnZXRNeVByb2plY3RzSW5Cb2FyZCcpO1xuICAgIH0pXG59XG5cbnZhciBnZXROb3RNeVByb2plY3RGb2xsb3dlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHByb21pc2VzID0gQ2hhbm5lbE1hbmFnZXJcbiAgICAvLyAxIC0gR2V0IHByb2plY3Qgb3IgY2hhbm5lbCBuYW1lIHRoYXQgSSBmb2xsb3dcbiAgICAgICAgLmdldFByb2plY3RDaGFubmVsTmFtZXMoKVxuICAgICAgICAubWFwKGZ1bmN0aW9uIChjaGFubmVsTmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIFByb2plY3RNYW5hZ2VyXG4gICAgICAgICAgICAgICAgLmdldFByb2plY3RCeUNoYW5uZWxOYW1lKGNoYW5uZWxOYW1lKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChwcm9qZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9qZWN0IHx8IGNoYW5uZWxOYW1lO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZ2V0UHJvamVjdEJ5Q2hhbm5lbE5hbWUgaGFzIGJ1Z2dlZCcpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuICAgIC8vIDIgLSBGaWx0ZXIgdGhvc2Ugd2hvc2UgSSBhbSBtZW1iZXIgYW5kIHRyYW5zZm9ybXMgdGhlbSB0byBjaGFubmVsXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uIChwcm9qZWN0T3JDaGFubmVsTmFtZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBwcm9qZWN0T3JDaGFubmVsTmFtZXNcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uIChwb2NuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAgKHR5cGVvZiBwb2NuID09PSBcInN0cmluZ1wiICkgfHwgIVByb2plY3RNYW5hZ2VyLmlzTXlQcm9qZWN0KHBvY24pXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uIChwb2NuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBDaGFubmVsTWFuYWdlci5jcmVhdGVDaGFubmVsKHBvY24pO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYnVnIGluIGdldHRpbmcgZ2V0UHJvamVjdEJ5Q2hhbm5lbE5hbWVcIik7XG4gICAgICAgIH0pXG59XG5cbnZhciBfYm9hcmRzSWRzID0gW107XG5cbnZhciByZW5kZXJDaGFubmVscyA9IGZ1bmN0aW9uKCkge1xuICAgIFByb21pc2UuYWxsKFtcbiAgICAvLyAxIC0gR2V0IGNoYW5uZWxzIGJ5IGNhdGVnb3J5XG4gICAgICAgIC8vIFByb21pc2UucmVzb2x2ZShDaGFubmVsTWFuYWdlci5nZXROb3RQcm9qZWN0Q2hhbm5lbHMoKSksICAgIC8vIE90aGVyIG5vbiBwcm9qZWN0IENoYW5uZWxzXG4gICAgICAgIGdldE5vdE15UHJvamVjdEZvbGxvd2VkKCkgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFByb2plY3QgZm9sbG93ZWQsIGJ1dCBub3QgbWVtYmVyXG4gICAgICAgIC8vIGdldE15UHJvamVjdHNJbkJvYXJkKF9ib2FyZHNJZHMuc2VlZHMpLCAgICAgICAgICAgICAgLy8gTXkgcHJvamVjdCBpbiBzZWVkXG4gICAgICAgIC8vIGdldE15UHJvamVjdHNJbkJvYXJkKF9ib2FyZHNJZHMuYXJib3JpdW0pICAgICAgICAgICAgLy8gTXkgcHJvamVjdHMgaW4gYXJib3JpdW1cbiAgICBdKS50aGVuKGZ1bmN0aW9uIChjaGFubmVsKSB7XG4gICAgICAgIHZhciBteVByb2plY3RzRG9uZSA9IF8ucGFydGl0aW9uKGNoYW5uZWxbM10sIGZ1bmN0aW9uKGNoYW5uZWwpIHtcbiAgICAgICAgICAgIHJldHVybiBbXCI1NGI5NDljNzBhOGNjMzYzZjRjYmRmNzRcIiwgXCI1NGI5NDljYThhYTZkNmZiYTRjODc3MDBcIl0uaW5kZXhPZihjaGFubmVsLnByb2plY3QuaWRMaXN0KSA9PSAtMTtcbiAgICAgICAgfSk7XG4gICAgLy8gMiAtIFJlbmRlciB0aGUgY2hhbm5lbHNcbiAgICAgICAgU2VjdGlvblJlbmRlcmVyLmFkZFNlY3Rpb24oXCJTUE0tb3RoZXJfY2hhbm5lXCIsIFwiQVVUUkUgQ0hBTk5FTFNcIiwgY2hhbm5lbFswXSwgZmFsc2UpO1xuICAgICAgICBTZWN0aW9uUmVuZGVyZXIuYWRkU2VjdGlvbihcIlNQTS1wcm9qZWN0LWZvbGxvd2VkXCIsIFwiTUVTIFBST0pFVFMgU1VJVklTXCIsIGNoYW5uZWxbMV0sIHRydWUpO1xuICAgICAgICBTZWN0aW9uUmVuZGVyZXIuYWRkU2VjdGlvbihcIlNQTS1teV9wcm9qZWN0X2RvbmVcIiwgXCJNRVMgUFJPSkVUUyBGSU5JU1wiLCBteVByb2plY3RzRG9uZVswXSwgdHJ1ZSk7XG4gICAgICAgIFNlY3Rpb25SZW5kZXJlci5hZGRTZWN0aW9uKFwiU1BNLXByb2plY3RcIiwgXCJNRVMgR1JBSU5FU1wiLCBjaGFubmVsWzJdLCB0cnVlKTtcbiAgICAgICAgU2VjdGlvblJlbmRlcmVyLmFkZFNlY3Rpb24oXCJTUE0tbXlfcHJvamVjdFwiLCBcIk1FUyBQUk9KRVRTXCIsIG15UHJvamVjdHNEb25lWzFdLCB0cnVlKTtcbiAgICAgICAgJChcIiNjaGFubmVsLWxpc3RcIikuaGlkZSgpO1xuICAgIH0pLmNhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnYnVnIGluIE15UHJvamVjdHMgYXBwJyk7XG4gICAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGluaXQ6IGZ1bmN0aW9uKCkge1xuOyAgICAgICAgcmV0dXJuIHdhaXRVbnRpbENoYW5uZWxzQXJlSGVyZSgpXG4gICAgICAgICAgICAudGhlbihyZW5kZXJDaGFubmVscyk7XG4gICAgfSxcblxuICAgIHVwZGF0ZVByb2plY3Q6IGZ1bmN0aW9uKHByb2plY3QpIHtcbiAgICAgICAgcmVuZGVyQ2hhbm5lbHMoKTtcbiAgICB9LFxuXG4gICAgc2V0Qm9hcmRJZHM6IGZ1bmN0aW9uKGJvYXJkSWRzKSB7XG4gICAgICAgIF9ib2FyZHNJZHMgPSBib2FyZElkcztcbiAgICB9XG59O1xuXG5cbiIsInZhciBDb2RlSW5qZWN0b3IgICA9IHJlcXVpcmUoJ1NQTS9VdGlscy9Db2RlSW5qZWN0b3IuanMnKTtcbnZhciBVcmxDaGFuZ2VkICAgICA9IHJlcXVpcmUoJ1NQTS9VdGlscy9VcmxDaGFuZ2VkLmpzJyk7XG52YXIgVXRpbHMgICAgICAgICAgPSByZXF1aXJlKCdTUE0vVXRpbHMvVXRpbHMuanMnKTtcbnZhciBQcm9qZWN0TWFuYWdlciA9IHJlcXVpcmUoJ1NQTS9Nb2RlbC9Qcm9qZWN0L1Byb2plY3RNYW5hZ2VyLmpzJyk7XG52YXIgUGFuZWxSZW5kZXJlciAgPSByZXF1aXJlKCdTUE0vYXBwcy9Qcm9qZWN0UGFuZWwvdmlld3MvUGFuZWxSZW5kZXJlci5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgQ29kZUluamVjdG9yLmluamVjdEZpbGUoXCJqcy9hcHBzL1Byb2plY3RQYW5lbC9wYW5lbEluamVjdGVkQ29kZS5qc1wiKTtcblxuICAgICAgICBVcmxDaGFuZ2VkLm9uQ2hhbmdlZChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMub25DaGFuZ2VkKCk7XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgIHRoaXMub25DaGFuZ2VkKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgfSxcblxuICAgIHJlbmRlckN1cnJlbnRQcm9qZWN0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFByb2plY3RNYW5hZ2VyXG4gICAgICAgICAgICAuZ2V0UHJvamVjdEJ5Q2hhbm5lbE5hbWUodGhpcy5jdXJyZW50UHJvamVjdE5hbWUpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihwcm9qZWN0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChwcm9qZWN0KT9cbiAgICAgICAgICAgICAgICAgICAgUGFuZWxSZW5kZXJlci5yZW5kZXIocHJvamVjdCk6XG4gICAgICAgICAgICAgICAgICAgIFBhbmVsUmVuZGVyZXIucmVuZGVyTm9Qcm9qZWN0KCk7XG4gICAgICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgb25DaGFuZ2VkOiBmdW5jdGlvbihmb3JjZSkge1xuXG4gICAgICAgIHZhciBwcm9qZWN0TmFtZSA9IFV0aWxzLmdldFByb2plY3ROYW1lRnJvbVVybChkb2N1bWVudC5VUkwpO1xuICAgICAgICBpZiAoZm9yY2UgfHwgdGhpcy5jdXJyZW50UHJvamVjdE5hbWUgIT09IHByb2plY3ROYW1lKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRQcm9qZWN0TmFtZSA9IHByb2plY3ROYW1lO1xuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFByb2plY3ROYW1lKSB7XG4gICAgICAgICAgICAgICB0aGlzLnJlbmRlckN1cnJlbnRQcm9qZWN0KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFBhbmVsUmVuZGVyZXIucmVzZXQoKTtcbiAgICAgICAgICAgICAgICBQYW5lbFJlbmRlcmVyLmNsb3NlUGFuZWwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfSxcblxuICAgIHVwZGF0ZVByb2plY3Q6IGZ1bmN0aW9uKHByb2plY3QpIHtcbiAgICAgICAgdGhpcy5vbkNoYW5nZWQodHJ1ZSk7XG4gICAgfVxufSIsInZhciBVdGlscyAgICAgICAgPSByZXF1aXJlKCdTUE0vVXRpbHMvVXRpbHMnKTtcbnZhciBDb2RlSW5qZWN0b3IgPSByZXF1aXJlKCdTUE0vVXRpbHMvQ29kZUluamVjdG9yJyk7XG4vKlxuICAgIFBSSVZBVEUgRlVOQ1RJT05TXG4qL1xuXG52YXIgcGFuZWxJc0hlcmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICQoXCIjZmxleF9jb250ZW50c1wiKS5sZW5ndGhcbn1cbnZhciB0aXRsZUlzSGVyZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJChcIiNhY3RpdmVfY2hhbm5lbF9uYW1lXCIpLmxlbmd0aFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRlbXBsYXRlOiBudWxsLFxuICAgIGluaXRUZW1wbGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLnRlbXBsYXRlID09PSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLnRlbXBsYXRlID0gbmV3IEVKUyh7dXJsOiBjaHJvbWUuZXh0ZW5zaW9uLmdldFVSTCgnanMvYXBwcy9Qcm9qZWN0UGFuZWwvdmlld3MvcGFuZWwuZWpzJyl9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBib2FyZHM6IG51bGwsXG4gICAgcHJvamVjdDogbnVsbCxcblxuICAgIHNldEJvYXJkczogZnVuY3Rpb24oYm9hcmRzKSB7XG4gICAgICAgIHRoaXMuYm9hcmRzID0gYm9hcmRzO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGluaXRpYWxpemVkOiBmYWxzZSxcbiAgICByZW5kZXI6IGZ1bmN0aW9uKHByb2plY3QpIHtcbiAgICAgICAgaWYgKCF0aGlzLmluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRUZW1wbGF0ZSgpO1xuXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlc2V0KCk7XG4gICAgICAgIHRoaXMucHJvamVjdCA9IHByb2plY3Q7XG4gICAgICAgIGlmICh0aGlzLnByb2plY3QpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkVGl0bGUoVXRpbHMuZ2V0RHVlRGF0ZSh0aGlzLnByb2plY3QuZHVlKSwgdGhpcy5wcm9qZWN0Lm5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMucHJvamVjdC5lcnJvcnMgJiYgdGhpcy5wcm9qZWN0LmVycm9ycy5tb3JlVGhhbk9uZVRyZWxsb0NhcmQpIHtcbiAgICAgICAgICAgIHZhciBwcm9qZWN0cyA9IHRoaXMucHJvamVjdC5lcnJvcnMubW9yZVRoYW5PbmVUcmVsbG9DYXJkLnJlZHVjZShmdW5jdGlvbihtZW1vLCBwcm9qZWN0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1lbW8gKyAnIC0gJysgcHJvamVjdC5uYW1lO1xuICAgICAgICAgICAgfSwgXCJcIik7XG4gICAgICAgICAgICB0aGlzLmFkZEVycm9yKCdQbHVzaWV1cnMgcHJvamV0cyBwb2ludGVudCB2ZXJzIGNldHRlIGRpc2N1c3Npb24gU2xhY2s6ICcgKyBwcm9qZWN0cyk7XG4gICAgICAgIH1cblxuXG5cbiAgICAgICAgVXRpbHNcbiAgICAgICAgICAgIC53YWl0VW50aWwocGFuZWxJc0hlcmUpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRQYW5lbCgpO1xuICAgICAgICAgICAgICAgIC8vdGhpcy5vcGVuUGFuZWwoKTtcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSlcbiAgICB9LFxuXG4gICAgcmVuZGVyTm9Qcm9qZWN0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5yZXNldCgpO1xuICAgICAgICB0aGlzLmNsb3NlUGFuZWwoKTtcbiAgICAgICAgdGhpcy5hZGRFcnJvcignVm91cyBkZXZleiBjcsOpZXIgdW5lIGNhcnRlIFRyZWxsbyAoc2kgY2UgblxcJ2VzdCBwYXMgZMOpasOgIGZhaXQpIGV0IHJlbnNlaWduZXIgY2UgY2hhbm5lbCBzbGFjay5cXFxuICAgICAgICAgICAgICAgICAgICAgICAgPGEgaWQ9XCJTUE0tY29weS1zbGFjay1jaGFuXCIgaHJlZj1cIiNcIj4gVm9pciBsZSBsaWVuLjwvYT48L3NwYW4+Jyk7XG4gICAgfSxcblxuICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5wcm9qZWN0ID0gbnVsbDtcbiAgICAgICAgLy8gcmVtb3ZlIGRpdlxuICAgICAgICB0aGlzLnBhbmVsRGl2ICYmIHRoaXMucGFuZWxEaXYucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMudGl0bGVEaXYgJiYgdGhpcy50aXRsZURpdi5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy5lcnJvckRpdiAmJiB0aGlzLmVycm9yRGl2LnJlbW92ZSgpO1xuICAgIH0sXG5cbiAgICBwYW5lbERpdjogbnVsbCxcbiAgICBhZGRQYW5lbDogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIENyZWF0ZSB0aGUgZGl2IGlmIG5vdCBoZXJlXG4gICAgICAgIHZhciBkaXYgPSAnPGRpdiBjbGFzcz1cInRhYi1wYW5lIGFjdGl2ZVwiIGlkPVwicHJvamVjdHNfdGFiXCI+PC9kaXY+JztcbiAgICAgICAgdGhpcy5wYW5lbERpdiA9ICQoZGl2KS5hcHBlbmRUbyhcIiNmbGV4X2NvbnRlbnRzXCIpO1xuXG4gICAgICAgIHRoaXMudGVtcGxhdGUudXBkYXRlKFwicHJvamVjdHNfdGFiXCIsIHtcbiAgICAgICAgICAgIHByb2plY3Q6IHRoaXMucHJvamVjdCxcbiAgICAgICAgICAgIGJvYXJkczogdGhpcy5ib2FyZHNcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICB0aXRsZURpdjogbnVsbCxcbiAgICBhZGRUaXRsZTogZnVuY3Rpb24oZGVhZGxpbmUsIHRpdGxlKSB7XG4gICAgICAgICQoXCIuU1BNLXRpdGxlXCIpLnJlbW92ZSgpO1xuICAgICAgICB2YXIgZG9tID0gJzxzcGFuIGNsYXNzPVwibmFtZSBTUE0tdGl0bGVcIj4nICtcbiAgICAgICAgKChkZWFkbGluZSk/ICc8c3BhbiBjbGFzcz1cIlNQTS1kZWFkbGluZS10aXRsZVwiPicgKyBkZWFkbGluZSArICc8L3NwYW4+ICcgOiAnJykgK1xuICAgICAgICB0aXRsZSArICc8L3NwYW4+JztcbiAgICAgICAgdGhpcy50aXRsZURpdiA9ICQoZG9tKS5pbnNlcnRBZnRlcihcIiNhY3RpdmVfY2hhbm5lbF9uYW1lXCIpO1xuICAgIH0sXG4gICAgZXJyb3JEaXY6IG51bGwsXG4gICAgYWRkRXJyb3I6IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICAgICAgdmFyIGRvbSA9ICc8ZGl2IGlkPVwiU1BNLW5vdGlmXCIgY2xhc3M9XCJtZXNzYWdlc19iYW5uZXJcIj4gXFxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gaWQ9XCJTUE0tY2hhbi1lcnJvclwiIGNsYXNzPVwib3ZlcmZsb3ctZWxsaXBzaXNcIj4gJyArIG1lc3NhZ2UgKyAnXFxcbiAgICAgICAgICAgICAgICA8L2Rpdj4nO1xuICAgICAgICB0aGlzLmVycm9yRGl2ID0gJChkb20pLmluc2VydEJlZm9yZShcIiNtZXNzYWdlc191bnJlYWRfc3RhdHVzXCIpO1xuICAgICAgICB2YXIgY2hhbk5hbWUgPSBVdGlscy5nZXRQcm9qZWN0TmFtZUZyb21VcmwoZG9jdW1lbnQuVVJMKVxuICAgICAgICBDb2RlSW5qZWN0b3IuaW5qZWN0Q29kZSgnXFxcbiAgICAgICAgICAgICAgICAkKFwiI1NQTS1jb3B5LXNsYWNrLWNoYW5cIikuY2xpY2soZnVuY3Rpb24oKSB7XFxcbiAgICAgICAgICAgICAgICB3aW5kb3cucHJvbXB0KFwiQ3RybCArIEMgZXQgcHVpcyBjb3BpZXIgZGFucyBsYSBkZXNjcmlwdGlvbiBkZSBsYSBjYXJ0ZSBzbGFja1wiLCBcIlxcXFxuKipTbGFjayoqIDogWycgK1xuICAgICAgICAgICAgICAgIGNoYW5OYW1lICsgJ10oaHR0cHM6Ly9ldmFuZW9zLnNsYWNrLmNvbS9tZXNzYWdlcy8nICsgY2hhbk5hbWUgKyAnKVxcXFxuXFxcXG5cIik7XFxcbiAgICAgICAgICAgICAgICB9KTtcXFxuICAgICAgICAnKTtcbiAgICB9LFxuICAgIG9wZW5QYW5lbDogZnVuY3Rpb24gKCkge1xuICAgICAgICBDb2RlSW5qZWN0b3IuaW5qZWN0Q29kZSgnXFxcbiAgICAgICAgICAgIFRTTS5vcGVuUGFuZWwoKTtcXFxuICAgICAgICAnKTtcbiAgICB9LFxuICAgIGNsb3NlUGFuZWw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgQ29kZUluamVjdG9yLmluamVjdENvZGUoJ1xcXG4gICAgICAgICAgICBpZiAoJChcIi5mbGV4X3BhbmVfc2hvd2luZyAjZmxleF90b2dnbGVcIikubGVuZ3RoICE9PSAwKSB7XFxcbiAgICAgICAgICAgICAgICAkKFwiI2ZsZXhfdG9nZ2xlXCIpLnRyaWdnZXIoXCJjbGlja1wiKTtcXFxuICAgICAgICAgICAgfVxcXG4gICAgICAgICcpO1xuICAgIH1cbn0iLCJ2YXIgQ29kZUluamVjdG9yID0gcmVxdWlyZSgnU1BNL1V0aWxzL0NvZGVJbmplY3Rvci5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgQ29kZUluamVjdG9yLmluamVjdEZpbGUoXCJqcy9hcHBzL1RvZ2dsZU1lbnUvdG9nZ2xlTWVudUluamVjdGVkQ29kZS5qc1wiKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxufSIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGluaXRDb25uZWN0aW9uOiBmdW5jdGlvbihzdWNjZXNzLCBlcnJvcikge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oc3VjY2VzcywgZXJyb3IpIHtcbiAgICAgICAgICAgIFRyZWxsby5hdXRob3JpemUoe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdwb3B1cCcsXG4gICAgICAgICAgICAgICAgbmFtZTogJ3RyZWxsby1zbGFjaycsXG4gICAgICAgICAgICAgICAgcGVyc2lzdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBleHBpcmF0aW9uOiAnbmV2ZXInLFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHN1Y2Nlc3MsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGVycm9yXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgcmVxdWVzdDogZnVuY3Rpb24gKG1ldGhvZCwgcGF0aE9ySWQsIHBhcmFtcykge1xuICAgICAgICB2YXIgbWV0aG9kVGhpcztcblx0ICAgIHZhciBtZXRob2QgPSBtZXRob2Rcblx0ICAgIFx0XHQuc3BsaXQoXCIuXCIpXG5cdCAgICBcdFx0LnJlZHVjZShmdW5jdGlvbiAodHJlbGxvRnVuYywgbWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZFRoaXMgPSB0cmVsbG9GdW5jO1xuXHRcdCAgICBcdFx0cmV0dXJuIHRyZWxsb0Z1bmNbbWV0aG9kXTtcblx0XHQgICAgXHR9LCBUcmVsbG8pXG4gICAgXHRyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24oc3VjY2VzcywgZXJyb3IpIHtcblx0XHRcdG1ldGhvZC5jYWxsKG1ldGhvZFRoaXMsIHBhdGhPcklkLCBwYXJhbXMgfHwge30sIHN1Y2Nlc3MsIGVycm9yKTtcbiAgICBcdH0pXG4gICAgICAgIC8vIExpdHRsZSBsb2cgcHJveHkgZm9yIFRyZWxsbyBBUEkgZXJyb3JzIDopXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBpbiBUcmVsbG8gQVBJOiBcIiwgZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuIGVycm9yO1xuICAgICAgICB9KVxuICAgIH1cbn07IiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgY2hhbm5lbE5hbWVzOiBbXSxcbiAgICBnZXRDaGFubmVsTmFtZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmluaXRDaGFubmVscygpO1xuICAgICAgICByZXR1cm4gdGhpcy5jaGFubmVsTmFtZXM7XG4gICAgfSxcblxuICAgIGdldFByb2plY3RDaGFubmVsTmFtZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Q2hhbm5lbE5hbWVzKCkuZmlsdGVyKHRoaXMuaXNQcm9qZWN0Q2hhbm5lbC5iaW5kKHRoaXMpKTtcbiAgICB9LFxuICAgIC8qXG4gICAgKiBmdW5jdGlvbiB3aGljaCByZXR1cm5zIHRoZSBsaXN0IG9mIGNoYW5uZWxzIHdoaWNoIGRvbid0IGJlZ2luIGJ5ICdwLSdcbiAgICAgKi9cbiAgICBnZXROb3RQcm9qZWN0Q2hhbm5lbHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gXy5maWx0ZXIodGhpcy5nZXRDaGFubmVsTmFtZXMoKSwgZnVuY3Rpb24oY2hhbm5lbE5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiAhdGhpcy5pc1Byb2plY3RDaGFubmVsKGNoYW5uZWxOYW1lKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKS5tYXAoZnVuY3Rpb24gKGNoYW5uZWxOYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVDaGFubmVsKGNoYW5uZWxOYW1lKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKVxuICAgIH0sXG5cbiAgICBjaGFubmVsSWRzOiBbXSxcbiAgICBnZXRDaGFubmVsSWRzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5pbml0Q2hhbm5lbHMoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2hhbm5lbElkcztcbiAgICB9LFxuXG4gICAgLypcbiAgICAqIFRoaXMgaXMgdG8ga25vdyB0aGF0IGNoYW5uZWxJZHMgYW5kIGNoYW5uZWxOYW1lcyBhcmUgdXAtdG8tZGF0ZS5cbiAgICAgKi9cbiAgICBpbml0Q2hhbm5lbHM6IGZ1bmN0aW9uKGZvcmNlKSB7XG4gICAgICAgIGlmIChmb3JjZSB8fCB0aGlzLmNoYW5uZWxJZHMubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIC8vIEdldCBDaGFubmVscyBpbiBDaGFubmVscyBsaXN0XG4gICAgICAgICAgICB0aGlzLmNoYW5uZWxJZHMgPSAkLm1hcCgkKFwiI2NoYW5uZWwtbGlzdCBhLmNoYW5uZWxfbmFtZSwgI3N0YXJyZWQtbGlzdCBhLmNoYW5uZWxfbmFtZVwiKSwgZnVuY3Rpb24oYSwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJChhKS5hdHRyKFwiZGF0YS1jaGFubmVsLWlkXCIpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMuY2hhbm5lbE5hbWVzID0gJC5tYXAoJChcIiNjaGFubmVsLWxpc3QgbGkgYS5jaGFubmVsX25hbWUgLm92ZXJmbG93X2VsbGlwc2lzLCAjc3RhcnJlZC1saXN0IGxpIGEuY2hhbm5lbF9uYW1lIC5vdmVyZmxvd19lbGxpcHNpc1wiKSwgZnVuY3Rpb24obGksIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICQobGkpLnRleHQoKS5yZXBsYWNlKC8oXFxyXFxufFxcbnxcXHJ8XFxzKykvZ20sXCJcIikuc2xpY2UoMSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gR2V0IENoYW5uZWxzIGluIFN0YXJyZWQgTGlzdFxuXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZ2V0Q2hhbm5lbElkRnJvbUNoYW5uZWxOYW1lOiBmdW5jdGlvbihjaGFubmVsTmFtZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5jaGFubmVsSWRzW18uaW5kZXhPZih0aGlzLmNoYW5uZWxOYW1lcywgY2hhbm5lbE5hbWUpXTtcbiAgICB9LFxuXG4gICAgaXNQcm9qZWN0Q2hhbm5lbDpmdW5jdGlvbiAoY2hhbm5lbE5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGNoYW5uZWxOYW1lLmluZGV4T2YoJ3AtJykgPT09IDA7XG4gICAgfSxcblxuXG4gICAgY3JlYXRlQ2hhbm5lbDogZnVuY3Rpb24gKGNoYW5uZWxPclByb2plY3QpIHtcbiAgICAgICAgLy8gMSAtIElmIGl0J3MgYSBjaGFubmVsXG4gICAgICAgIGlmICh0eXBlb2YgY2hhbm5lbE9yUHJvamVjdCA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgdmFyIGlkID0gdGhpcy5nZXRDaGFubmVsSWRGcm9tQ2hhbm5lbE5hbWUoY2hhbm5lbE9yUHJvamVjdClcbiAgICAgICAgICAgIHJldHVybiAge1xuICAgICAgICAgICAgICAgIG5hbWU6IGNoYW5uZWxPclByb2plY3QsXG4gICAgICAgICAgICAgICAgc2xhY2tJZDogaWRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgLy8gMiAtIElmIGl0J3MgYSBwcm9qZWN0XG4gICAgICAgIHZhciBwcm9qZWN0ID0gY2hhbm5lbE9yUHJvamVjdDtcbiAgICAgICAgdmFyIGNoYW5uZWwgPSB7fVxuICAgICAgICBpZiAocHJvamVjdC5zbGFjaykge1xuICAgICAgICAgICAgY2hhbm5lbC5uYW1lID0gcHJvamVjdC5zbGFja1xuICAgICAgICAgICAgY2hhbm5lbC5zbGFja0lkID0gdGhpcy5nZXRDaGFubmVsSWRGcm9tQ2hhbm5lbE5hbWUocHJvamVjdC5zbGFjaylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNoYW5uZWwubmFtZSA9IHByb2plY3QubmFtZTtcbiAgICAgICAgfVxuICAgICAgICBjaGFubmVsLnByb2plY3QgPSBwcm9qZWN0O1xuICAgICAgICByZXR1cm4gY2hhbm5lbDtcbiAgICB9XG5cbn0iLCJhcmd1bWVudHNbNF1bXCIvaG9tZS9qb2hhbi9ldmFuZW9zL3RyZWxsby1zbGFjay9qcy9ub2RlX21vZHVsZXMvU1BNL01vZGVsL01lbWJlck1hbmFnZXIuanNcIl1bMF0uYXBwbHkoZXhwb3J0cyxhcmd1bWVudHMpIiwiYXJndW1lbnRzWzRdW1wiL2hvbWUvam9oYW4vZXZhbmVvcy90cmVsbG8tc2xhY2svanMvbm9kZV9tb2R1bGVzL1NQTS9Nb2RlbC9Qcm9qZWN0L1Byb2plY3RNYW5hZ2VyLmpzXCJdWzBdLmFwcGx5KGV4cG9ydHMsYXJndW1lbnRzKSIsInZhciBVdGlscyA9IHJlcXVpcmUoJ1NQTS9VdGlscy9VdGlscy5qcycpO1xuXG52YXIgcGFyc2VMZWFkZXIgPSBmdW5jdGlvbiAocHJvamVjdCkge1xuICAgIHZhciBsZWFkZXIgPSBVdGlscy5wYXJzZUdldFZhbHVlRnJvbUtleShwcm9qZWN0LmRlc2MsICdsZWFkZXInKTtcbiAgICBpZiAoIWxlYWRlcikge1xuICAgICAgICBwcm9qZWN0LmVycm9ycy5ub0xlYWRlciA9IHRydWU7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgbGVhZGVyID0gVXRpbHMudW5hY2NlbnQobGVhZGVyKTtcbiAgICBpZihsZWFkZXJbMF0gPT09ICdAJykge1xuICAgICAgICAvLyBXaXRoIHRoZSBAbmFtZSBzeW50YXhcbiAgICAgICAgbGVhZGVyID0gbGVhZGVyLnNsaWNlKDEpO1xuICAgIH1cbiAgICB2YXIgbGVhZGVyRm91bmQgPSBwcm9qZWN0Lm1lbWJlcnMuc29tZShmdW5jdGlvbiAobWVtYmVyKSB7XG4gICAgICAgIHZhciBtZW1iZXJOYW1lID0gVXRpbHMudW5hY2NlbnQobWVtYmVyLmZ1bGxOYW1lLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICBpZiAobWVtYmVyTmFtZS5pbmRleE9mKGxlYWRlcikgIT09IC0xKSB7XG4gICAgICAgICAgICBtZW1iZXIuaXNMZWFkZXIgPSB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xuICAgIGlmIChsZWFkZXJGb3VuZCkge1xuICAgICAgICAvLyBMZWFkZXIgZmlyc3RcbiAgICAgICAgcHJvamVjdC5tZW1iZXJzLnNvcnQoZnVuY3Rpb24gKG1lbWJlcjEsIG1lbWJlcjIpIHtcbiAgICAgICAgICAgIHJldHVybiAobWVtYmVyMS5pc0xlYWRlcikgPyAtMSA6IChtZW1iZXIyLmlzTGVhZGVyKSA/IDEgOiAwO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwcm9qZWN0LmVycm9ycy51bmtub3duTGVhZGVyID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGxlYWRlckZvdW5kO1xufTtcblxudmFyIHBhcnNlU2xhY2sgPSBmdW5jdGlvbihwcm9qZWN0KSB7XG4gICAgdmFyIHNsYWNrID0gVXRpbHMucGFyc2VHZXRWYWx1ZUZyb21LZXkocHJvamVjdC5kZXNjLCAnKHNsYWNrfGNoYW5uZWx8Y2hhbmVsfGNoYW4pJyk7XG4gICAgaWYgKCFzbGFjaykge1xuICAgICAgICByZXR1cm5cbiAgICB9XG4gICAgaWYoc2xhY2tbMF0gPT09ICdbJykge1xuICAgICAgICAvLyBXaXRoIHRoZSBbbmFtZV0odXJsKSBzeW50YXhcbiAgICAgICAgdmFyIGluZGV4ID0gc2xhY2suaW5kZXhPZignXScpO1xuICAgICAgICBzbGFjayA9IHNsYWNrLnNsaWNlKDEsIGluZGV4KTtcbiAgICB9XG4gICAgaWYgKHNsYWNrWzBdID09PSAnIycpIHtcbiAgICAgICAgLy8gV2l0aCB0aGUgIyBzeW50YXhcbiAgICAgICAgc2xhY2sgPSBzbGFjay5zbGljZSgxKVxuICAgIH1cbiAgICBpZihzbGFjay5pbmRleE9mKCdwLScpICE9PSAwKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBwcm9qZWN0LnNsYWNrID0gc2xhY2s7XG4gICAgcmV0dXJuIHByb2plY3Quc2xhY2s7XG59O1xuXG52YXIgY2hlY2tFcnJvcnMgPSBmdW5jdGlvbiAocHJvamVjdCkge1xuICAgIGlmIChwcm9qZWN0LmlkTWVtYmVycy5sZW5ndGggPiA1KSB7cHJvamVjdC5lcnJvcnMudG9vTWFueU1lbWJlcnMgPSB0cnVlfTtcbiAgICBpZiAocHJvamVjdC5pZE1lbWJlcnMubGVuZ3RoIDwgMikge3Byb2plY3QuZXJyb3JzLnRvb0Zld01lbWJlcnMgPSB0cnVlfTtcbiAgICBpZiAocHJvamVjdC5uYW1lLm1hdGNoKC9eIz9wLS4qLykpIHtwcm9qZWN0LmVycm9ycy50aXRsZUlzU2xhY2tDaGFuID0gdHJ1ZX07XG59O1xuXG52YXIgaW5pdFByb2plY3QgPSBmdW5jdGlvbihwcm9qZWN0KSB7XG4gICAgcHJvamVjdC5lcnJvcnMgPSB7fTtcbiAgICB2YXIgbGVhZGVyID0gcGFyc2VMZWFkZXIocHJvamVjdCk7XG4gICAgdmFyIHNsYWNrID0gcGFyc2VTbGFjayhwcm9qZWN0KTtcbiAgICAvLyBOZWVkIHRvIDJ4IHRoZSBsaW5lIGJyZWFrIGZvciBJU08gdHJlbGxvIG1hcmtkb3duIHJlbmRlcmluZ1xuICAgIHByb2plY3QuZGVzYyA9IFV0aWxzLmRvdWJsZUxpbmVCcmVhayhwcm9qZWN0LmRlc2MpO1xuICAgIC8vIENhcGl0YWxpemUgZmlyc3QgbGV0dGVyXG4gICAgcHJvamVjdC5uYW1lID0gcHJvamVjdC5uYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcHJvamVjdC5uYW1lLnNsaWNlKDEpO1xuICAgIGNoZWNrRXJyb3JzKHByb2plY3QpO1xuICAgIHJldHVybiBwcm9qZWN0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBpbml0UHJvamVjdDsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIGluamVjdEZpbGU6IGZ1bmN0aW9uKGZpbGVOYW1lKSB7XG4gICAgICAgIHZhciBzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG4gICAgICAgIC8vIFRPRE86IGFkZCBcInNjcmlwdC5qc1wiIHRvIHdlYl9hY2Nlc3NpYmxlX3Jlc291cmNlcyBpbiBtYW5pZmVzdC5qc29uXG4gICAgICAgIHMuc3JjID0gY2hyb21lLmV4dGVuc2lvbi5nZXRVUkwoZmlsZU5hbWUpO1xuICAgICAgICBzLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMpO1xuICAgICAgICB9O1xuICAgICAgICAoZG9jdW1lbnQuaGVhZHx8ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KS5hcHBlbmRDaGlsZChzKTtcbiAgICB9LFxuXG4gICAgaW5qZWN0Q29kZTogZnVuY3Rpb24oY29kZSkge1xuICAgICAgICB2YXIgcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAgICAgICBzLnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0JztcbiAgICAgICAgLy8gVE9ETzogYWRkIFwic2NyaXB0LmpzXCIgdG8gd2ViX2FjY2Vzc2libGVfcmVzb3VyY2VzIGluIG1hbmlmZXN0Lmpzb25cbiAgICAgICAgcy5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzKTtcbiAgICAgICAgfTtcbiAgICAgICAgcy5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjb2RlKSk7XG4gICAgICAgIChkb2N1bWVudC5oZWFkfHxkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpLmFwcGVuZENoaWxkKHMpO1xuXG4gICAgfVxufSIsIkNvZGVJbmplY3RvciA9IHJlcXVpcmUoJ1NQTS9VdGlscy9Db2RlSW5qZWN0b3InKTtcblxudmFyIFVybENoYW5nZWQgPSB7XG4gICAgb25DaGFuZ2VkOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICBpZiAoJChcIi51cmxjaGFuZ2VkXCIpLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICB0aGlzLl9pbml0aWFsaXplKCk7XG4gICAgICAgIH1cbiAgICAgICAgJCh0aGlzKS5vbigndXJsQ2hhbmdlZCcsIGNhbGxiYWNrKTtcbiAgICB9LFxuXG4gICAgX2luaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoJChcIi51cmxjaGFuZ2VkXCIpLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgJChcImJvZHlcIikuYXBwZW5kKFwiPGRpdiBjbGFzcz0ndXJsY2hhbmdlZCc+PC9kaXY+XCIpO1xuICAgICAgICB9XG4gICAgICAgIENvZGVJbmplY3Rvci5pbmplY3RDb2RlKCdcXFxuICAgICAgICAgICAgKGZ1bmN0aW9uKGhpc3Rvcnkpe1xcXG4gICAgICAgICAgICAgICAgdmFyIHB1c2hTdGF0ZSA9IGhpc3RvcnkucHVzaFN0YXRlO1xcXG4gICAgICAgICAgICAgICAgaGlzdG9yeS5wdXNoU3RhdGUgPSBmdW5jdGlvbihzdGF0ZSkge1xcXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaGlzdG9yeS5vbnB1c2hzdGF0ZSA9PSBcImZ1bmN0aW9uXCIpIHtcXFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlzdG9yeS5vbnB1c2hzdGF0ZSh7c3RhdGU6IHN0YXRlfSk7XFxcbiAgICAgICAgICAgICAgICAgICAgfVxcXG4gICAgICAgICAgICAgICAgICAgIGlmICgkKFwiLnVybGNoYW5nZWRcIikubGVuZ3RoID4gMCkge1xcXG4gICAgICAgICAgICAgICAgICAgICAgICAkKFwiLnVybGNoYW5nZWRcIikuYXBwZW5kKFwiaFwiKTtcXFxuICAgICAgICAgICAgICAgICAgICB9XFxcbiAgICAgICAgICAgICAgICAgICAgXFxcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHB1c2hTdGF0ZS5hcHBseShoaXN0b3J5LCBhcmd1bWVudHMpO1xcXG4gICAgICAgICAgICAgICAgfVxcXG4gICAgICAgICAgICB9KSh3aW5kb3cuaGlzdG9yeSk7XFxcbiAgICAgICAgJyk7XG5cblxuICAgICAgICAvLyBzZWxlY3QgdGhlIHRhcmdldCBub2RlXG4gICAgICAgIHZhciB0YXJnZXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcudXJsY2hhbmdlZCcpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBhbiBvYnNlcnZlciBpbnN0YW5jZVxuICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbihtdXRhdGlvbnMpIHtcbiAgICAgICAgICBtdXRhdGlvbnMuZm9yRWFjaChmdW5jdGlvbihtdXRhdGlvbikge1xuICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VyKCd1cmxDaGFuZ2VkJyk7XG4gICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcblxuICAgICAgICAvLyBjb25maWd1cmF0aW9uIG9mIHRoZSBvYnNlcnZlcjpcbiAgICAgICAgdmFyIGNvbmZpZyA9IHsgYXR0cmlidXRlczogdHJ1ZSwgY2hpbGRMaXN0OiB0cnVlLCBjaGFyYWN0ZXJEYXRhOiB0cnVlIH07XG5cbiAgICAgICAgLy8gcGFzcyBpbiB0aGUgdGFyZ2V0IG5vZGUsIGFzIHdlbGwgYXMgdGhlIG9ic2VydmVyIG9wdGlvbnNcbiAgICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZSh0YXJnZXQsIGNvbmZpZyk7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFVybENoYW5nZWQ7IiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgd2FpdFVudGlsOiBmdW5jdGlvbihpc1JlYWR5KSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihzdWNjZXNzLCBlcnJvcikge1xuICAgICAgICAgICAgdmFyIHRpbWVySWRcbiAgICAgICAgICAgIHRpbWVySWQgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNSZWFkeSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGltZXJJZCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdWNjZXNzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgfSlcbiAgICB9LFxuXG4gICAgZ2V0UHJvamVjdE5hbWVGcm9tVXJsOiBmdW5jdGlvbih1cmwpIHtcbiAgICAgICAgY29uc29sZS5sb2codXJsKVxuICAgICAgICB2YXIgY2hhbm5lbCA9IHVybC5zcGxpdCgnLycpWzRdO1xuICAgICAgICBpZiAoY2hhbm5lbCAmJiBjaGFubmVsLnN1YnN0cmluZygwLDIpID09ICdwLScpIHtcbiAgICAgICAgICAgIHJldHVybiBjaGFubmVsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgdW5hY2NlbnQ6IGZ1bmN0aW9uIChzKSB7XG4gICAgICAgIHZhciBhY2NlbnRNYXAgPSB7XG4gICAgICAgICAgICAnw7QnOidvJyxcbiAgICAgICAgICAgICfDqSc6J2UnLCAnw6gnOidlJywnw6onOidlJywgJ8OrJzonZScsXG4gICAgICAgICAgICAnw6AnOiAnYScsXG4gICAgICAgICAgICAnw64nOidpJywgJ8OvJzogJ2knLFxuICAgICAgICAgICAgJ8OnJzonYydcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIFtdLm1hcC5jYWxsKHMsIGZ1bmN0aW9uIChjKSB7XG4gICAgICAgICAgICByZXR1cm4gYWNjZW50TWFwW2NdIHx8IGM7XG4gICAgICAgIH0pLmpvaW4oJycpXG4gICAgfSxcblxuICAgIHBhcnNlR2V0VmFsdWVGcm9tS2V5OiBmdW5jdGlvbihkZXNjLCBrZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gZGVzY1xuICAgICAgICAgICAgLnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgIC5tYXRjaChuZXcgUmVnRXhwKFwiKFxcXFxufF4pLio/XCIgKyBrZXkgKyBcIi4qPzouKj8oXFxcXG58JClcIikpO1xuICAgICAgICBpZiAoIXZhbHVlKSB7cmV0dXJuIGZhbHNlfVxuICAgICAgICByZXR1cm4gdmFsdWVbMF1cbiAgICAgICAgICAgIC5zbGljZSh2YWx1ZVswXS5pbmRleE9mKCc6JykgKyAxKVxuICAgICAgICAgICAgLnRyaW0oKS5yZXBsYWNlKC9eXFwqK3xcXCorJC9nLCAnJykudHJpbSgpO1xuICAgIH0sXG5cbiAgICBnZXREdWVEYXRlOiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICAgIHZhciBkaWZmID0gbW9tZW50KGRhdGUpLmRpZmYobW9tZW50KCksICdkYXlzJyk7XG4gICAgICAgIGlmIChkaWZmID49IDApIHtcbiAgICAgICAgICAgIHJldHVybiBcIkotXCIgKyBkaWZmO1xuICAgICAgICB9IGVsc2UgaWYgKGRpZmYgPCAwKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJKK1wiICsgTWF0aC5hYnMoZGlmZik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBkb3VibGVMaW5lQnJlYWs6IGZ1bmN0aW9uIChkZXNjKSB7XG4gICAgICAgIHJldHVybiBkZXNjLnJlcGxhY2UoL1teXFxuXVxcblteXFxuXS9nLCBmdW5jdGlvbihzdHIpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHJbMF0gKyBcIlxcblxcblwiICsgc3RyWzJdO1xuICAgICAgICB9LCBcImdcIik7XG4gICAgfSxcblxuICAgIG9uRG9tQ2hhbmdlZDogZnVuY3Rpb24oc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG5cbiAgICAgICAgLy8gc2VsZWN0IHRoZSB0YXJnZXQgbm9kZVxuICAgICAgICB2YXIgdGFyZ2V0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG5cbiAgICAgICAgLy8gY3JlYXRlIGFuIG9ic2VydmVyIGluc3RhbmNlXG4gICAgICAgIHZhciBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGZ1bmN0aW9uKG11dGF0aW9ucykge1xuICAgICAgICAgICAgbXV0YXRpb25zLmZvckVhY2goZnVuY3Rpb24obXV0YXRpb24pIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcblxuICAgICAgICAvLyBjb25maWd1cmF0aW9uIG9mIHRoZSBvYnNlcnZlcjpcbiAgICAgICAgdmFyIGNvbmZpZyA9IHsgYXR0cmlidXRlczogZmFsc2UsIGNoaWxkTGlzdDogdHJ1ZSwgY2hhcmFjdGVyRGF0YTogZmFsc2UgfTtcblxuICAgICAgICAvLyBwYXNzIGluIHRoZSB0YXJnZXQgbm9kZSwgYXMgd2VsbCBhcyB0aGUgb2JzZXJ2ZXIgb3B0aW9uc1xuICAgICAgICBvYnNlcnZlci5vYnNlcnZlKHRhcmdldCwgY29uZmlnKTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlRnJvbUFycmF5OiBmdW5jdGlvbihrZXksIGFycmF5KSB7XG4gICAgICAgIHZhciBpbmRleCA9IGFycmF5LmluZGV4T2Yoa2V5KTtcbiAgICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgIGFycmF5LnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcblxuICAgIHJlbW92ZUZyb21PYmplY3Q6IGZ1bmN0aW9uKGtleSwgb2JqZWN0KSB7XG4gICAgICAgIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgZGVsZXRlIG9iamVjdFtrZXldO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgaXNBcnJheTogZnVuY3Rpb24oYXJyYXkpIHtcbiAgICAgICAgaWYoIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCggYXJyYXkgKSA9PT0gJ1tvYmplY3QgQXJyYXldJyApIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwidmFyIENvZGVJbmplY3RvciA9IHJlcXVpcmUoJ1NQTS9VdGlscy9Db2RlSW5qZWN0b3IuanMnKTtcbnZhciBVdGlscyAgICAgICAgPSByZXF1aXJlKCdTUE0vVXRpbHMvVXRpbHMuanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICBzZWN0aW9uczogW10sXG5cbiAgICBhZGRTZWN0aW9uOiBmdW5jdGlvbihpZCwgdGl0bGUsIGNoYW5uZWxzLCBpc1Byb2plY3RTZWN0aW9uKSB7XG4gICAgICAgIC8vIEZpcnN0IHVzZSwgaW5pdGlhbGl6ZVxuICAgICAgICBpZiAodGhpcy5zZWN0aW9ucy5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgdGhpcy5faW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG5cblxuICAgICAgICAvLyBjcmVhdGUgb2JqZWN0IHNlY3Rpb25cbiAgICAgICAgLy8gQHRvZG8gcmVwbGFjZSBieSBjbGFzc1xuICAgICAgICB2YXIgc2VjdGlvbiA9IF8uZmluZCh0aGlzLnNlY3Rpb25zLCBmdW5jdGlvbihzKSB7IHJldHVybiBzLmlkID09IGlkfSkgfHwge307XG4gICAgICAgIHNlY3Rpb24udGl0bGUgPSB0aXRsZTtcbiAgICAgICAgc2VjdGlvbi5pc1Byb2plY3RTZWN0aW9uID0gaXNQcm9qZWN0U2VjdGlvbjtcbiAgICAgICAgc2VjdGlvbi5jaGFubmVscyA9IGNoYW5uZWxzO1xuICAgICAgICBzZWN0aW9uLmlkID0gaWQ7XG5cbiAgICAgICAgLy8gYWRkIGl0IHRvIHRoZSBzZWN0aW9uc1xuICAgICAgICB0aGlzLnNlY3Rpb25zLnB1c2goc2VjdGlvbik7XG5cbiAgICAgICAgLy8gYWRkIGRvbVxuICAgICAgICB0aGlzLmFkZFNlY3Rpb25EaXZJZk5vdEV4aXN0KHNlY3Rpb24pO1xuXG4gICAgICAgIHRoaXMudXBkYXRlTWVudUl0ZW0oc2VjdGlvbik7XG4gICAgfSxcblxuICAgIF9pbml0aWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5pbml0VGVtcGxhdGUoKTtcbiAgICAgICAgQ29kZUluamVjdG9yLmluamVjdEZpbGUoXCJqcy9WaWV3SGVscGVycy9NZW51U2VjdGlvblZpZXdIZWxwZXIvbWVudVNlY3Rpb25JbmplY3RlZENvZGUuanNcIik7XG5cbiAgICAgICAgVXRpbHMub25Eb21DaGFuZ2VkKFwiI2NoYW5uZWwtbGlzdFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlKCk7XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgfSxcblxuICAgIHVwZGF0ZTogZnVuY3Rpb24oc2VjdGlvbikge1xuICAgICAgICBmb3IgKHZhciBpID0gMCA7IGkgPCB0aGlzLnNlY3Rpb25zLmxlbmd0aCA7IGkrKykge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVNZW51SXRlbSh0aGlzLnNlY3Rpb25zW2ldKTtcbiAgICAgICAgfVxuICAgIH0sXG5cblxuICAgIGFkZFNlY3Rpb25EaXZJZk5vdEV4aXN0OiBmdW5jdGlvbihzZWN0aW9uKSB7XG4gICAgICAgIGlmICgkKFwiI1wiK3NlY3Rpb24uaWQpLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICB2YXIgZGl2ID0gJzxkaXYgaWQ9XCInICsgc2VjdGlvbi5pZCArICdcIiBjbGFzcz1cIlNQTS1zZWN0aW9uLWFkZGVkIHNlY3Rpb25faG9sZGVyXCI+PC9kaXY+JztcbiAgICAgICAgICAgIHZhciBpbmRleCA9IDA7XG4gICAgICAgICAgICBpZiAoJChcIiNzdGFycmVkX2RpdlwiKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQoXCIjY2hhbm5lbHNfc2Nyb2xsZXJcIikuY2hpbGRyZW4oKS5lcShpbmRleCkuYmVmb3JlKGRpdik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnRlbXBsYXRlLnVwZGF0ZShzZWN0aW9uLmlkLCB7XG4gICAgICAgICAgICBjaGFubmVsczogc2VjdGlvbi5jaGFubmVscyxcbiAgICAgICAgICAgIHRpdGxlOiBzZWN0aW9uLnRpdGxlLFxuICAgICAgICAgICAgaXNQcm9qZWN0U2VjdGlvbjogc2VjdGlvbi5pc1Byb2plY3RTZWN0aW9uXG4gICAgICAgIH0pO1xuXG4gICAgfSxcblxuICAgIHVwZGF0ZU1lbnVJdGVtOiBmdW5jdGlvbihzZWN0aW9uKSB7XG4gICAgICAgICQoXCIjXCIgKyBzZWN0aW9uLmlkICsgXCIgbGkuY2hhbm5lbFwiKS5lYWNoKGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICB2YXIgaWQgPSAkKHRoaXMpLmZpbmQoXCIuY2hhbm5lbF9uYW1lXCIpLmF0dHIoXCJkYXRhLWNoYW5uZWwtaWRcIik7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKVswXS5vdXRlckhUTUwgIT0gJChcIiNjaGFubmVsLWxpc3QgLmNoYW5uZWxfXCIgKyBpZCArIFwiLCAjc3RhcnJlZC1saXN0IC5jaGFubmVsX1wiK2lkKVswXS5vdXRlckhUTUwpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLnJlcGxhY2VXaXRoKCQoXCIjY2hhbm5lbC1saXN0IC5jaGFubmVsX1wiICsgaWQgKyBcIiwjc3RhcnJlZC1saXN0IC5jaGFubmVsX1wiK2lkKS5jbG9uZSgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIENvZGVJbmplY3Rvci5pbmplY3RDb2RlKFwiVFMuY2xpZW50LmNoYW5uZWxfcGFuZS5tYWtlU3VyZUFjdGl2ZUNoYW5uZWxJc0luVmlldygpO1wiKTtcbiAgICB9LFxuXG4gICAgdGVtcGxhdGU6IG51bGwsXG4gICAgaW5pdFRlbXBsYXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHRoaXMudGVtcGxhdGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMudGVtcGxhdGUgPSBuZXcgRUpTKHt1cmw6IGNocm9tZS5leHRlbnNpb24uZ2V0VVJMKCdqcy9WaWV3SGVscGVycy9NZW51U2VjdGlvblZpZXdIZWxwZXIvbWVudVNlY3Rpb24uZWpzJyl9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cblxufSIsImFyZ3VtZW50c1s0XVtcIi9ob21lL2pvaGFuL2V2YW5lb3MvdHJlbGxvLXNsYWNrL2pzL25vZGVfbW9kdWxlcy9TUE0vYXBwcy9Qcm9qZWN0UGFuZWwvdmlld3MvUGFuZWxSZW5kZXJlci5qc1wiXVswXS5hcHBseShleHBvcnRzLGFyZ3VtZW50cykiLCJhcmd1bWVudHNbNF1bXCIvaG9tZS9qb2hhbi9ldmFuZW9zL3RyZWxsby1zbGFjay9qcy9ub2RlX21vZHVsZXMvU1BNL2Nvbm5lY3Rvci9UcmVsbG9Db25uZWN0b3IuanNcIl1bMF0uYXBwbHkoZXhwb3J0cyxhcmd1bWVudHMpIiwiYXJndW1lbnRzWzRdW1wiL2hvbWUvam9oYW4vZXZhbmVvcy90cmVsbG8tc2xhY2svanMvbm9kZV9tb2R1bGVzL1NQTS9ub2RlX21vZHVsZXMvU1BNL01vZGVsL01lbWJlck1hbmFnZXIuanNcIl1bMF0uYXBwbHkoZXhwb3J0cyxhcmd1bWVudHMpIiwiYXJndW1lbnRzWzRdW1wiL2hvbWUvam9oYW4vZXZhbmVvcy90cmVsbG8tc2xhY2svanMvbm9kZV9tb2R1bGVzL1NQTS9ub2RlX21vZHVsZXMvU1BNL1V0aWxzL0NvZGVJbmplY3Rvci5qc1wiXVswXS5hcHBseShleHBvcnRzLGFyZ3VtZW50cykiLCJhcmd1bWVudHNbNF1bXCIvaG9tZS9qb2hhbi9ldmFuZW9zL3RyZWxsby1zbGFjay9qcy9ub2RlX21vZHVsZXMvU1BNL25vZGVfbW9kdWxlcy9TUE0vVXRpbHMvVXRpbHMuanNcIl1bMF0uYXBwbHkoZXhwb3J0cyxhcmd1bWVudHMpIiwiYXJndW1lbnRzWzRdW1wiL2hvbWUvam9oYW4vZXZhbmVvcy90cmVsbG8tc2xhY2svanMvbm9kZV9tb2R1bGVzL1NQTS9ub2RlX21vZHVsZXMvU1BNL2Nvbm5lY3Rvci9UcmVsbG9Db25uZWN0b3IuanNcIl1bMF0uYXBwbHkoZXhwb3J0cyxhcmd1bWVudHMpIiwiYXJndW1lbnRzWzRdW1wiL2hvbWUvam9oYW4vZXZhbmVvcy90cmVsbG8tc2xhY2svanMvbm9kZV9tb2R1bGVzL1NQTS9ub2RlX21vZHVsZXMvU1BNL25vZGVfbW9kdWxlcy9TUE0vY29ubmVjdG9yL1RyZWxsb0Nvbm5lY3Rvci5qc1wiXVswXS5hcHBseShleHBvcnRzLGFyZ3VtZW50cykiXX0=
