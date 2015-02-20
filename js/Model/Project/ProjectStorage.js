function() {

var SPM = SPM || {};
SPM.Storages = SPM.Storages || {};

var _projects = {};
var _projectsByChannel = {};
var _projectsByUser = {};
var _projectsBySearch = {};


SPM.Storages.ProjectStorage = {


	saveProject: function(project) {
		_projects[project.id] = project;
		if (project.slack) {
			_projectsByChannel[project.slack] = project.id;
		}
        if (project.members) {
            _.map(project.members, function(member) {
                projectsByUser[member.id].push(project);
            })
        }
		return project
	},

	saveProjects: function (projects) {
		projects.forEach(function (project) {
			this.saveProject(project);
		}.bind(this))
		return projects;
	},

    searchProject: function(search) {
        if (_projectsBySearch[search]) {
            return Promise.resolve(_projectsBySearch[search]);
        } else {
            return Promise.reject("no data");
        }
    },

	getProjectsByUser: function (user) {
        var projects = _.filter(_projects, function(project) {
            return _.find(project.members, function(member) {
                return member.id == user.id
            }.bind(this));
        }.bind(this));
        if (projects.length > 0) {
            return Promise.resolve(projects);
        } else {
            return Promise.reject("No data")
        }
	},

	noProjectForChannel: function (channelName) {
		_projectsByChannel[channelName] = false;
	},

    noProjectForUser: function (user) {
        _projectsByUser[user.id] = false;
    },

	getByChannelName: function (channelName) {
		var projectId = _projectsByChannel[channelName]
		return (projectId === undefined)?
			Promise.reject("No data"):
			Promise.resolve(_projects[projectId]);
	}
}

}();