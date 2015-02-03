var SPM = SPM || {};
SPM.Storages = SPM.Storages || {};

SPM.Storages.ProjectStorage = {
	projects: {},
	projectsByChannel: {},
	myProjects: undefined,

	saveProject: function(project) {
		this.projects[project.id] = project;
		if (project.slack) {
			this.projectsByChannel[project.slack] = project.id;
		}
		return project
	},

	saveMyProjects: function (projects) {
		this.myProjects = [];
		projects.forEach(function (project) {
			this.saveProject(project);
			this.myProjects.push(project.id);
		}.bind(this))
		return projects;
	},

	getMyProjects: function (projects) {
		return (this.myProjects)?
			Promise.resolve(this.myProjects.map(function (projectId) { return this.projects[projectId] }.bind(this))):
			Promise.reject("No data")
	},

	setProjectChannel: function (channelName, project) {
		if (!(project && project.slack)) {
			this.projectsByChannel[channelName] = false;
		}
	},

	getByChannelName: function (channelName) {
		var projectId = this.projectsByChannel[channelName]
		return (projectId === undefined)? 
			Promise.reject("No data"):
			Promise.resolve(this.projects[projectId]);
	}
}