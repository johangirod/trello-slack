var Utils = require('../../Utils/Utils.js');

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

var parseIteration = function (project) {
    var name = project.name.toUpperCase();
    var ite = 1;
    if (name.match(/ II$/)) {
        ite = 2;
    } else if (name.match(/ III$/)) {
        ite = 3;
    } else if (name.match(/ IV$/)) {
        ite = 4;
    } else if (name.match(/ V$/)) {
        ite = 5;
    } else if (name.match(/ VI$/)) {
        ite = 6;
    } else if (name.match(/ VII$/)) {
        ite = 7;
    } else if (name.match(/ VIII$/)) {
        ite = 8;
    } else if (name.match(/ IX$/)) {
        ite = 9;
    } else if (name.match(/ X$/)) {
        ite = 10;
    }
    project.iteration = ite;
    return ite;
}

var checkErrors = function (project) {
    if (project.idMembers.length > 5) {project.errors.tooManyMembers = true};
    if (project.idMembers.length < 2) {project.errors.tooFewMembers = true};
    if (project.name.match(/^#?p-.*/)) {project.errors.titleIsSlackChan = true};
};

var initProject = function(project) {
    // Capitalize first letter
    project.name = project.name.charAt(0).toUpperCase() + project.name.slice(1);

    project.errors = {};
    parseLeader(project);
    parseSlack(project);
    parseIteration(project);

    // Need to 2x the line break for ISO trello markdown rendering
    project.desc = Utils.doubleLineBreak(project.desc);
    checkErrors(project);
    return project;
};

module.exports = initProject;