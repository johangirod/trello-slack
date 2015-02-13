var TSM = TSM || {};
TSM.openPanel = function() {
    $(".tab-pane.active").removeClass("active");
    $("#projects_tab").addClass("active");
    if ($(".flex_pane_showing #flex_toggle").length == 0) {
        $("#flex_toggle").trigger('click');
    }
}

$( "body" ).on( "click", ".SPM-title", function() {

    TSM.openPanel()
});
if ($(".urlchagned").length == 0) {
     $("body").append("<div class='urlchanged'></div>");
}