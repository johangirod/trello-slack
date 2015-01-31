$( "body" ).on( "click", ".SPM-title", function() {
    $(".tab-pane.active").removeClass("active");
    $("#projects_tab").addClass("active");
    if ($(".flex_pane_showing #flex_toggle").length == 0) {
        $("#flex_toggle").trigger('click');
    }
});