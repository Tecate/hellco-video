// declarting all common variables
// to avoid scope issues
var feedUrl = "";
var sessionID = "";
var east1Count = 0;
var east2Count = 0;
var west1Count = 0;
var totalCount = 0;

// common functions 
// update #current-server name
function updateServerName() {
  if(feedUrl == "http://scum.systems:8080/stream.m3u8") { // if east1
    $("#current-server").text("New York");
  };
  if(feedUrl == "http://west.scum.systems:8080/stream.m3u8") { // if west1
    $("#current-server").text("California");
  };
  if(feedUrl == "http://east2.scum.systems:8080/stream.m3u8") { // if east2
    $("#current-server").text("New York 2");
  };
};

// writes the viewer count of the currently connected server to markup
// might be able to merge this with updateServerName()
function updateServerCount() {
  if(feedUrl == "http://scum.systems:8080/stream.m3u8") { // if east1
    $("#current-server-count").text(east1Count);
  };
  if(feedUrl == "http://west.scum.systems:8080/stream.m3u8") { // if west1
    $("#current-server-count").text(west1Count);
  };
  if(feedUrl == "http://east2.scum.systems:8080/stream.m3u8") { // if east2
    $("#current-server-count").text(east2Count);
  };
};

// for replying to the websocket server
function sendSocketReply() {
  // send the feedUrl and sessionID to the websocket server
  socketReply = {
    feedUrl: feedUrl,
    sessionID: sessionID
  };
  socket.send(JSON.stringify(socketReply));
};


// connecting to the websocket
var socket = new WebSocket('ws://scum.systems:5001/','hellco-video'); 

// fires when the client recieves a message from the server
socket.onmessage = function (message) { 

  // parsing json message to object
  var msg = JSON.parse(message.data);

  // if the client is assigned a sessionID
  if(typeof msg.sessionID !== "undefined") {
    // saves the sessionID
    sessionID = msg.sessionID;
    console.log(sessionID);
  }

  // updates the viewer counts
  totalCount = msg.total;
  east1Count = msg.east1;
  east2Count = msg.east2;
  west1Count = msg.west1;

  // writes the viewer counts to markup
  $("#viewer-count").text(totalCount);
  $(".east1-count").text(east1Count);
  $(".east2-count").text(east2Count);
  $(".west1-count").text(west1Count);

  updateServerCount();
};

// listening for any socket error
socket.onerror = function (error) { 
  // displays error message in markup
  $(".error-message").show();
  $("#error-text").text('WebSocket error: please refresh. Or we might be doing maintenance.'); // + JSON.stringify(error));
};

// function to check if websocket is connected
// this should automatically try to reconnect if the connection fails
function waitForSocketConnection(socket, callback){
  setTimeout(function () {
    if (socket.readyState === 1) {
        console.log("Connection is made")
        if(callback != null){
            callback();
        }
        return;

    } else {
        console.log("Waiting for connection...")
        waitForSocketConnection(socket, callback);
    }

  }, 1000); // retry every second
};

// fires when websocket is connected
waitForSocketConnection(socket, function(setFeedUrl){
  // hide the websocket loading screen
  $(".video-loading").hide();

  // sends the sessionID to the websocket server
  socketReply = {
    feedUrl: "NO STREAM",
    sessionID: sessionID
  };
  socket.send(JSON.stringify(socketReply));

  // checking if the client is using safari
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
      sendSocketReply();

      // writes the name of the currently connected server to markup
      updateServerName();
    });
  } else {
    // fires when client is using non-safari browsers
    if(Hls.isSupported()) {
      // find the video element in markup
      var video = document.getElementById('local');
      var hls = new Hls();
      // fires when someone clicks a button in the inital server menu
      $(".server-menu-button").click(function(){
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
          sendSocketReply();
        });

        // writes the name of the currently connected server to markup
        updateServerName();
      });
    }
  }
});

// fires when a client uses the stream-select dropdown menu

$('#stream-select').change(function() {
  feedUrl = $(this).find(":selected").val();
  updateServerName();
  $(this).val("");
  waitForSocketConnection(socket, function(setFeedUrl){
    if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) {
      // SPECIAL SNOWFLAKE SAFARI HACKS GO HERE
      console.log('Fuck you for using safari');
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
      sendSocketReply();
    } else {
      // only runs when hls is supported
      // CAN'T RUN HLS.JS IN SAFARI BECAUSE FUCK YOU
      if(Hls.isSupported()) {
        var video = document.getElementById('local');
        var hls = new Hls();
        hls.loadSource(feedUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED,function() {
          // hides the server menu
          $("#server-menu").hide();
          // enable the stream selection dropdown
          $('#stream-select').removeAttr('disabled');
          // play the video
          video.play();
          sendSocketReply();
        });
      }
    }
  });
});


// closing the socket cleanly
// we need to send the id/feedurl before the socket is closed
// if we don't it will use the last active socketID for that ip
window.onbeforeunload = function() {
    socket.onclose = function () {
      sendSocketReply();
    };
    socket.close()
};