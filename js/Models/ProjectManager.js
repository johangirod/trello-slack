var SPM = SPM || {};

var getMembers = function (project) {
    return Promise.all(project.idMembers.map(function (idMember) {
        return SPM.TrelloConnector.request("members.get", idMember);
    }))
    .then(function (members) {
        project.members = members;
        return project;
    });
};

var parseLeader = function (project) {
    var leader = SPM.Utils.parseGetValueFromKey(project.desc, 'leader');
    if (!leader) {
        project.errors.noLeader = true;
        return false;
    }
    leader = SPM.Utils.unaccent(leader);
    var leaderFound = project.members.some(function (member) {
        var memberName = SPM.Utils.unaccent(member.fullName.toLowerCase());
        if (leader.indexOf(memberName)) {
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
}

var parseSlack = function(project) {
    project.slack = SPM.Utils.parseGetValueFromKey(project.desc, 'slack');
    if (project.slack) {
        project.slack = project.slack.slice(1);
        project.slackId = SPM.Models.ChannelManager.getChannelIdFromChannelName(project.slack);

    }
    return project.slack;
}

var checkErrors = function () {
    if (project.members.length > 5) {project.errors.tooManyMembers = true};
    if (project.title.match(/^#?p-.*/)) {project.errors.titleIsSlackChan = true};
}

SPM.ProjectManager = {
	initProject: function(project) {
        project.errors = {};
        return getMembers(project)
        .then(function(project) {
			var leader = parseLeader(project);
            var slack = parseSlack(project);
            // setLeader(project);
            // setConsultingTeam(project);
            // setKPI(project);
            // setDescription(project);

            // Need to 2x the line break for ISO trello markdown rendering
            project.desc = SPM.Utils.doubleLineBreak(project.desc);
            // Capitalize first letter
            project.name = project.name.charAt(0).toUpperCase() + project.name.slice(1);
			return project;
		})
	},

    isMyProject: function(project) {
        return _.find(project.members, function(member) {
            return SPM.MemberManager.me.id == member.id;
        })
    },

    findProject: function(query) {
        return SPM.TrelloConnector.request("get","/search", {
                "query": '"'+query+'"',
                "idOrganizations": _.map(SPM.BoardManager.boards, function(board) {return board.idOrganization}),
                "idBoards" : _.map(SPM.BoardManager.boards, function(board) {return board.id})
            })
        .then(function(result) {
            cards = result.cards;
            if (! cards.length) {
                return Promise.reject("there is no card in Trello with the name: " + query);
            }
            if (cards.length > 1) {
                console.warn("There is several Trello cards associated to this project !");
            }
            return SPM.ProjectManager.initProject(cards[0]);
        }.bind(this));
    },

    findProjects: function(queries) {
        return Promise.all(queries.map(function(projectName) {
            return SPM.ProjectManager
                .findProject(projectName)
                .catch(function () {
                    return null;
                })
            }))
    },

    getMyProjectsWithChannels: function() {
        return SPM.ProjectManager.findProjects(SPM.Models.ChannelManager.getProjectChannelNames())
        .then(function (projects) {
            return _.filter(projects, function(project){
                if (project && project.slackId) {
                    return _.find(project.members, function(member) {
                        return SPM.MemberManager.me.id == member.id;
                    })
                } else {
                    return false;
                }
            });
        });
    },


    getNotMyProjectsWithChannels: function() {
        return SPM.ProjectManager.findProjects(SPM.Models.ChannelManager.getProjectChannelNames())
        .then(function (projects) {
            return _.filter(projects, function(project){
                if (project && project.slackId) {
                    var isMe = _.find(project.members, function(member) {
                        return SPM.MemberManager.me.id == member.id;
                    })
                    if (!isMe) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            });
        });
    },

    getProjectsWithChannels: function() {
        return SPM.ProjectManager.findProjects(SPM.Models.ChannelManager.getProjectChannelNames())
        .then(function (projects) {
            return _.filter(projects, function(project){
                if (project && project.slackId) {
                    return true;
                } else {
                    return false;
                }
            });
        });
    },

    getProjectsWithoutChannels: function() {
        return SPM.ProjectManager.findProjects(SPM.Models.ChannelManager.getProjectChannelNames())
        .then(function (projects) {
            return _.filter(projects, function(project){
                if (project && project.slackId) {
                    return false;
                } else {
                    return true;
                }
            });
        });
    },

    getProjectChannelsWithoutProjects: function() {
        var projectChannels = SPM.Models.ChannelManager.getProjectChannelNames();
        return SPM.ProjectManager.findProjects(projectChannels)
        .then(function (projects) {
            return _.filter(projectChannels, function(projectChannel){
                var is = !_.find(projects, function(project) {
                    if (project) {
                        return project.slack == projectChannel;
                    } else {
                        return false;
                    }
                })
                return is;
            });
        });
    },

    getNotMyProjectsChannels: function() {
        var projectChannels = SPM.Models.ChannelManager.getProjectChannelNames();
        return SPM.ProjectManager.findProjects(projectChannels)
        .then(function (projects) {
            var projectsChannelsFull = _.map(projectChannels, function(projectChannel){
                var project = _.find(projects, function(project) {
                    if (project && project.slack == projectChannel) {
                        return project;
                    } else {
                        return false;
                    }
                })
                if (project) {
                    return project;
                } else {
                    return {
                        name: null,
                        slackId: SPM.Models.ChannelManager.getChannelIdFromChannelName(projectChannel),
                        slack: projectChannel
                    };
                }
            });
            var notMyProjectsChannelsFull = _.filter(projectsChannelsFull, function(project) {
                return !SPM.ProjectManager.isMyProject(project);
            });
            return notMyProjectsChannelsFull;
        });
    },

    getNotProjectsChannels: function() {
        var notProjectChannels = SPM.Models.ChannelManager.getNotProjectChannelNames();
        var projectsChannelsFull = _.map(notProjectChannels, function(channel){
            return {
                name: null,
                slackId: SPM.Models.ChannelManager.getChannelIdFromChannelName(channel),
                slack: channel,
                notProject: true
            };
        });
        return new Promise(function(success, error) {
            return success(projectsChannelsFull);
        });
    },

    getAllProjectsInBoard: function(boardId) {
        return SPM.TrelloConnector.request("get","/boards/" + boardId + "/cards").then(function(projects) {
            return projects;
        });
    },

    getMyProjectsInBoard: function(boardId) {
        return this.getAllProjectsInBoard(boardId)
        .then(function (projects) {
            return _.filter(projects, function(project){
                if (project) {
                    parseSlack(project);
                    return _.find(project.idMembers, function(idMember) {
                        return SPM.MemberManager.me.id == idMember;
                    })
                } else {
                    return false;
                }
            });
        });
    },

    getMyProjectsInBoardWithoutChannel: function(boardId) {
        return this.getAllProjectsInBoard(boardId)
        .then(function (projects) {
            return _.filter(projects, function(project){
                if (project) {
                    parseSlack(project);
                    return _.find(project.idMembers, function(idMember) {
                        if (SPM.MemberManager.me.id == idMember && !project.slackId) {
                            return true;
                        } else {
                            return false;
                        }
                    })
                } else {
                    return false;
                }
            });
        });
    },

    getNotMyProjectsInBoard: function(boardId) {
        return this.getAllProjectsInBoard(boardId)
        .then(function (projects) {
            return _.filter(projects, function(project){
                if (project) {
                    parseSlack(project);
                    var isMe = _.find(project.idMembers, function(idMember) {
                        return SPM.MemberManager.me.id == idMember;
                    })
                    if (!isMe) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            });
        });
    }
}