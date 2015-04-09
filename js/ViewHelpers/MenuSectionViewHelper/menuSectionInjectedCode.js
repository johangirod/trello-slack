$( "body" ).on( "click", ".SPM-section-added .channel_name", function() {
    var id = $(this).attr("data-channel-id");
    $("#channel-list [data-channel-id="+id+"], #starred-list [data-channel-id="+id+"]").trigger('click');

});


$( "body" ).on( "click", ".SPM-no-slack", function() {

    alert($(this).nextAll('.SPM-project-informations').children('.SPM-error').attr('data-text'));

});

if ($("#sidebar_behavior").length > 0) {
    $("body").addClass('SPM-not-show-all');
}

$("body").on('change', '#sidebar_behavior_select', function() {
    if ($("#sidebar_behavior").length > 0) {
        $("body").addClass('SPM-not-show-all');
    } else {
        $("body").removeClass('SPM-not-show-all');
    }
})