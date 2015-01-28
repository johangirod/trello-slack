$( "body" ).on( "click", ".TS-title", function() {
        $(".tab-pane.active").removeClass("active");
        $("#projects_tab").addClass("active");
        if ($(".flex_pane_showing #flex_toggle").length == 0) {
            // this doesn't work !!! It is working when I'm executing it in the console :(
            $("#flex_toggle").trigger('click');
        }
    });