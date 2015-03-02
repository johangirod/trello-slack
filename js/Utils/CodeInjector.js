module.exports = {

    injectFile: function(fileName) {
        var s = document.createElement('script');
        // TODO: add "script.js" to web_accessible_resources in manifest.json
        s.src = chrome.extension.getURL(fileName);
        s.onload = function() {
            this.parentNode.removeChild(this);
        };
        (document.head||document.documentElement).appendChild(s);
    },

    injectCode: function(code) {
        var s = document.createElement('script');
        s.type = 'text/javascript';
        // TODO: add "script.js" to web_accessible_resources in manifest.json
        s.onload = function() {
            this.parentNode.removeChild(this);
        };
        s.appendChild(document.createTextNode(code));
        (document.head||document.documentElement).appendChild(s);

    }
}