$( "body" ).on( "click", "#SPM-my_project .channel_name", function() {
    var id = $(this).attr("data-channel-id");
    $("#channels").hide();
    $("#channel-list [data-channel-id="+id+"]").trigger('click');
    setTimeout(function() {
        $("#channels").show();
    }, 10);
});

