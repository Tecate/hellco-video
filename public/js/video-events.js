// alert("loaded");
// $( document ).ready(function() {
$(".server-menu-button").live( "click", function() {
  alert("why");
});
// });

if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) {
  // SPECIAL SNOWFLAKE SAFARI HACKS GO HERE
  // safari doesn't use hls.js because hls playback in native
  console.log('Fuck you for using safari');

  // fires when someone clicks a button in the inital server menu
  $(".server-menu-button").click(function(){
    // sets the feedUrl to the server selected
    feedUrl = $(this).val();
    // hides the server menu after click
    $("#server-menu").hide();
    // enable the stream selection dropdown
    $('#stream-select').removeAttr('disabled');
    // sets the video player source url
    $('#local').attr('src', feedUrl);
    // play the video
    $('#local').get(0).play();
  });
} else {
  // fires when client is using non-safari browsers
  if(Hls.isSupported()) {
    // find the video element in markup
    var video = document.getElementById('local');
    var hls = new Hls();
    // fires when someone clicks a button in the inital server menu
    $(".server-menu-button").click(function(){
      alert("why");
      // sets the feedUrl to the server selected
      feedUrl = $(this).val();
      // sets the video player source url
      hls.loadSource(feedUrl);
      hls.attachMedia(video);
      // fires if the m3u8 doesn't 404/error
      hls.on(Hls.Events.MANIFEST_PARSED,function() {
        // hides the server menu
        $("#server-menu").hide();
        // enable the stream selection dropdown
        $('#stream-select').removeAttr('disabled');
        // play the video
        video.play();
      });
    });
  }
}