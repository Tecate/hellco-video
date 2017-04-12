
$("#error-close").click(function() {
  $(".error-message").hide();
});


// var videoElement = document.getElementById("local");
// function toggleFullScreen() {
//   if (!document.mozFullScreen && !document.webkitFullScreen) {
//     if (videoElement.mozRequestFullScreen) {
//       videoElement.mozRequestFullScreen();
//     } else {
//       videoElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
//     }
//   } else { // unfullscreening doesn't work
//     if (document.mozCancelFullScreen) {
//       document.mozCancelFullScreen();
//     } else {
//       document.webkitCancelFullScreen();
//     }
//   }
// }

// // another safari fix
// $(document).ready(function() {
//   var videoHeight = $('#local').height() + $('.video-head').height();
//   $("iframe").height(videoHeight);
//   $(".chat-container").height(videoHeight);
//   $("#local").dblclick(function() {
//     toggleFullScreen();
//   });
// });

// $( window ).resize(function() {
//   var videoHeight = $('#local').height() + $('.video-head').height();
//   $("iframe").height(videoHeight);
//   $(".chat-container").height(videoHeight);
// });

$(document).on('click', 'video', function (e) { // do all this shit when you click on a video
  var video = $(this).get(0);
  activePlayer = $(this).get(0);
  if (video.paused === false) {
    video.pause();
  } else {
    video.play();
  }
  return false;
});


// $(document).ready(function () { // pause/play video on spacebar
//   var video = document.getElementById('local');
//   $(window).keypress(function(e) {
//     if (e.which == 32) {
//       e.preventDefault();
//       if (video.paused == false) {
//         video.pause();
//       } else {
//         video.play();
//       }
//     }
//   });
// });

// 404 checker
// currently not useful
// $.ajax({
//     url: 'http://scum.systems:8080/stream.m3u8',
//     dataType: "json",
//     success: function(data) {
//     },
//     error: function(data) {
        
//     }
// });