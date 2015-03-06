var CodeInjector = require('../../Utils/CodeInjector.js');

module.exports = {
    init: function() {
        CodeInjector.injectFile("js/apps/ToggleMenu/toggleMenuInjectedCode.js");
        return true;
    }
}