var SPM = SPM || {};
SPM.Model = SPM.Model || {};


SPM.Model.ProjectManager = {
    isMyProject: function(project) {
        return _.find(project.members, function(member) {
            return SPM.Model.MemberManager.me.id == member.id;
        })
    },

    myProjects: false,
    getMyProjects: function () {
        var myProjects = SPM.Storages.ProjectStorage.getProjectsByUser(SPM.Model.MemberManager.me);
        if (!this.myProjects || myProjects.length == 0) {
            return this.findMyProjects().then(function(projects) {
                return Promise.resolve(SPM.Storages.ProjectStorage.getProjectsByUser(SPM.Model.MemberManager.me));
            })
        } else {
            return Promise.resolve(myProjects);
        }
        return SPM.Storages.ProjectStorage.getProjectsByUser(SPM.Model.MemberManager.me)
            .catch(function () {
                return this
                    .findMyProjects()
                    .then(this.getMyProjects.bind(this))
            }.bind(this))
    },

    getProjectByChannelName: function (channelName) {
        return SPM.Storages.ProjectStorage.getByChannelName(channelName)
            .catch(function () {
                return this
                    .findProjectByChannelName(channelName)
                    .then(this.getProjectByChannelName.bind(this, channelName))
            }.bind(this))
    }

}