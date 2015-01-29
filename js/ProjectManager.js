var TS = TS || {};

var getMembers = function (project) {
    return Promise.all(project.idMembers.map(function (idMember) {
        return TS.TrelloManager.request("members.get", idMember)
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
	var leader = project.desc
		.toLowerCase()
		.match(/leader.*?:[ ]*[\w]+.*?\n/)
	if (!leader) {return false}
	leader = leader[0]
	leader = leader.slice(leader.indexOf(':') + 1)
		.trim()
		.split(' ')[0]
	var leader = TS.Utils.unaccent(leader)
	return project.members.some(function (member) {
		var memberName = TS.Utils.unaccent(member.fullName.toLowerCase())
		console.log("5",memberName,leader)
		if (leader.indexOf(memberName)) {
			member.isLeader = true;
			return true;
		}
		return false;
	})
}

TS.ProjectManager = {
	initProject: function(project) {
		return getMembers(project)
		.then(function(project) {
			var leader = parseLeader(project);
			// setLeader(project);
			// setConsultingTeam(project);
			// setKPI(project);
			// setDescription(project);
			return project;
		})
	}

}