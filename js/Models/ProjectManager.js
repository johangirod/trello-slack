var SPM = SPM || {};

var getMembers = function (project) {
    return Promise.all(project.idMembers.map(function (idMember) {
        return SPM.TrelloConnector.request("members.get", idMember)
    }))
    .then(function (members) {
        project.members = members;
        return project
    })
}

// var setLeader = function (project) {
// 	_.find(project.members, function (member) {
// 		member.indexOf()
// 	})
// }

var parseLeader = function (project) {
    var leader = SPM.Utils.parseGetValueFromKey(project.desc, 'leader');
    if (leader) {
        return project.members.some(function (member) {
            var memberName = SPM.Utils.unaccent(member.fullName.toLowerCase())
            if (leader.indexOf(memberName)) {
                member.isLeader = true;
                return true;
            }
            return false;
        })
    }
    return false;

}

var parseSlack = function(project) {
    project.slack = SPM.Utils.parseGetValueFromKey(project.desc, 'slack').slice(1);
    project.slackId = SPM.Models.ChannelManager.getChannelIdFromChannelName(project.slack);
    return project.slack;
}

SPM.ProjectManager = {
	initProject: function(project) {
		return getMembers(project)
		.then(function(project) {
			var leader = parseLeader(project);
            var slack = parseSlack(project);
			// setLeader(project);
			// setConsultingTeam(project);
			// setKPI(project);
			// setDescription(project);
			return project;
		})
	},

    findProject: function(query) {
        return SPM.TrelloConnector.request("get","/search", {
                "query": '"'+query+'"',
                "idOrganizations": _.map(this.boardIds, function(board) {return board.idOrganization}),
                "idBoards" : _.map(this.boardIds, function(board) {return board.id})
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
        return Promise
        // 1- Getting all the projects
        .all(queries.map(function(projectName) {
            return new Promise(function(success, error) {
                SPM.ProjectManager.findProject(projectName)
                .then(function(project) {
                    success(project);
                }.bind(this))
                .catch(function() {
                    success();
                }.bind(this));
            }.bind(this));
        }.bind(this)))
    },

    findMyProjects: function() {
        return SPM.ProjectManager.findProjects(SPM.Models.ChannelManager.getChannelNames())
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
    }
}