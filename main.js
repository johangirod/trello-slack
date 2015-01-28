var TS = TS || {};

TS.Initializer = {
    /**
    * Let's go!
    */
    init: function() {
        this.injectCode("js/injectedCode.js");

        TS.ProjectManager.init(["l49f2LxM", "IVh8Diai"]).then(function() {
            this.checkChange();
        }.bind(this))

        this.searchCurrentProject();
    },

    renderCurrentProject: function(project) {
        TS.CurrentProjectRenderer.render(project);
    },

    currentProject: null,

    searchCurrentProject: function() {
        var project = TS.ProjectHelper.getProjectNameFromUrl(document.URL);
        if (this.currentProject !== project) {
            this.currentProject = project;
            TS.ProjectManager.searchProject(this.currentProject).then(function(project) {
                this.renderCurrentProject(project);
            }.bind(this)).catch(function(msg) {
                alert(msg);
            });
        }
    },
    timerId: null,

    checkChange: function(callback) {
        // Very beautiful way to know if the layout has been changed
        this.searchCurrentProject();
        this.timerId = setInterval(function() {
            this.searchCurrentProject();
        }.bind(this), 100);
    },

    injectCode: function(fileName) {
        var s = document.createElement('script');
        // TODO: add "script.js" to web_accessible_resources in manifest.json
        s.src = chrome.extension.getURL(fileName);
        s.onload = function() {
            this.parentNode.removeChild(this);
        };
        (document.head||document.documentElement).appendChild(s);
    }
}

window.onload = function() {
    TS.Initializer.init();
}