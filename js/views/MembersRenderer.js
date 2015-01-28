var TS = TS || {};
TS.MembersRenderer = {
    render: function(members) {
        return _.reduce(members, function(memo, member) {
            return memo + this.renderMember(member);
        }.bind(this), "");

    },

    renderMember: function(member) {
        if (member.avatarHash === null) {
            var initials = member.fullName.match(/\b\w/g).join('');
            return '\
                <div class="TS-member">\
                    <div class="TS-member-initials">' + initials + '</div>\
                </div>\
            ';
        } else {
            return '\
                <div class="TS-member">\
                    <img class="TS-member-avatar" height="30" width="30" src="https://trello-avatars.s3.amazonaws.com/' + member.avatarHash + '/30.png" alt="' + member.name + '" title="' + member.name + '">\
                </div>\
            ';
        }

    }


}