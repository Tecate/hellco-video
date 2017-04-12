$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize variables
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box
  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page

  var feedUrl = "";
  var lastFeedUrl = "";
  var alertMessage = "scum systems";
  var relayList;
  var totalViewers = 0;
  var reconnected = 0;
  var flairImg;
  var currentUsers;

  window.setInterval(function(){
    socket.emit("request relays");
  }, 10000);

  function generateUI() {
    // Removing all child elements
    // $(".button-wrapper").empty();
    $("#stream-select").empty();
    $("<option />", {
      text: "Select Server",
      value: "",
      selected: true,
      disabled: true
    }).appendTo("#stream-select");

    for(var i in relayList.server){
      // // Generating buttons in server menu
      // $('<button />', {
      //   class: 'server-menu-button',
      //   id: relayList.server[i].name,
      //   value: relayList.server[i].url,
      //   text: relayList.server[i].cleanName
      // }).appendTo(".button-wrapper");

      // // Generating viewer counts in buttons
      // $('<div />', {
      //   class: 'button-count oi oi-eye',
      //   title: 'Viewers',
      //   text: ' ' + relayList.server[i].viewers
      // }).appendTo("#" + relayList.server[i].name);

      // Generating options in dropdown menu
      $('<option />', {
        value: relayList.server[i].url,
        text: relayList.server[i].cleanName,
        id: relayList.server[i].name
      }).appendTo("#stream-select");

      $('<span />', {
        id: relayList.server[i].name + "-count",
        text: " [" + relayList.server[i].viewers + "]"
      }).appendTo("#"+relayList.server[i].name);

    }
  }

  function updateCounts() {
    totalViewers = 0;
    for (var i in relayList.server) {
      var matched = 0;
      for(var j in relayList.viewers){
        if (relayList.server[i].url == relayList.viewers[j].streamurl) {
          $("#" + relayList.server[i].name + "-count").text(" [" + relayList.viewers[j].viewCount + "]");
          totalViewers += relayList.viewers[j].viewCount;
          matched = 1;
        }
        if(relayList.viewers[j].streamurl == feedUrl)
          $("#current-server-count").text("[" + relayList.viewers[j].viewCount + "]");
        if(matched == 0)
          $("#" + relayList.server[i].name + "-count").text(" [" + 0 + "]");
      }
    }
    $("#viewer-count").text(totalViewers);
  }

  function switchStream() {
    socket.emit('switch stream', {
      lastFeedUrl: lastFeedUrl,
      feedUrl: feedUrl
    });
  }

  function currentServerName() {
    for (var i in relayList.server) {
      if (relayList.server[i].url == feedUrl) {
        return relayList.server[i].cleanName;
      }
    }
  }

  $('#stream-select').change(function() {
    lastFeedUrl = feedUrl;
    feedUrl = $(this).find(":selected").val();
    $(this).val("");
    $("#current-server").text(currentServerName());

    create_player(feedUrl);
    switchStream();

    // if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) {
    //   // SPECIAL SNOWFLAKE SAFARI HACKS GO HERE
    //   console.log('Fuck you for using safari');
    //   // sets the feedUrl to the server selected
    //   feedUrl = $(this).val();
    //   // hides the server menu after click
    //   $("#server-menu").hide();
    //   // enable the stream selection dropdown
    //   $('#stream-select').removeAttr('disabled');
    //   // sets the video player source url
    //   $('#local').attr('src', feedUrl);
    //   // play the video
    //   $('#local').get(0).play();
    //   switchStream();
    // } else {
    //   // only runs when hls is supported
    //   // CAN'T RUN HLS.JS IN SAFARI BECAUSE FUCK YOU
    //   if(Hls.isSupported()) {
    //     var video = document.getElementById('local');
    //     var hls = new Hls();
    //     hls.loadSource(feedUrl);
    //     hls.attachMedia(video);
    //     hls.on(Hls.Events.MANIFEST_PARSED,function() {
    //       // hides the server menu
    //       $("#server-menu").hide();
    //       // enable the stream selection dropdown
    //       $('#stream-select').removeAttr('disabled');
    //       // play the video
    //       video.play();
    //       switchStream();
    //     });
    //   }
    // }
  });

  // Prompt for setting a username
  var username = generateNickname();
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();

  var socket = io.connect('https://'+connectDomain+':3000', {secure:true});

  // Generate client name
  function generateNickname() {
      var wngPlugin = new $.wng(
          {
              "size"  : 4,
              "sound" : "random",
              "leet"  : ""
          }
      );
      
          return wngPlugin.generate();
  }

  function linkify(message) {
    var urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return message.replace(urlRegex, function(url) {
      // banned links go here
      var bannedUrls = ["hockeytownhd", "facebook", "ustream", "hdsports.online"]
      var linkPunishment = 'no';
      var found = false;
      for (var i in bannedUrls) {
        if (url.toLowerCase().includes(bannedUrls[i])) {
          found = true;
          return '<a href="' + linkPunishment + '"target=' + '"_blank' + '">' + url + '</a>';
        } 
      }
      if(!found) {
        return '<a href="' + url + '"target=' + '"_blank' + '">' + url + '</a>';
      }
    });
  }

  function chatCommand(message) {
    if (message.substring(0,1) == "/") {
      // add chat commands here
      changeNick(message);
      setPrivilege(message);
      banUser(message);
      chatAlert(message);
      helpText(message);
      clearChat(message);
      unbanUser(message);
      users(message);
      deleteMessages(message);
      pickFlair(message);
      return true;
    }
    return false;
  }

  function helpText(message) {
    if (message.substring(0,5) == "/help") {
      log("Commands: /users, /nick, /clear, /flair, /help");
    }
  }

  function clearChat(message) {
    if (message.substring(0,6) == "/clear") {
      $(".messages").empty();
      log("Chat has been cleared.");
    }
  }

  function pickFlair(message) {
    if (message.substring(0,6) == "/flair") {
      $("#flair-picker").show();
    }
  }

  $("#flair-picker").on('click', ".flair", function(){ 
    flairImg = $(this).attr("class").split(" ");
    flairImg = flairImg[1];
    $("#flair-picker").hide();
    socket.emit('set flair', flairImg);
    log("Your flair is now: " + '<div class="flair ' + flairImg + '"></div>');
    $inputMessage.focus();
  });

  function greenText(message) {
    if (message.substring(0,1) == ">") {
      var newMessage = '<span class="green-text">' + message + '</span>';
      alert(newMessage);
      return true;
    }
    return false;
  } 

  function validName(name){
    var validName = 1;
    for(var i in name){
      var char = name[i].charCodeAt();
      if(char < 32 || char > 126)
        validName = 0;
    }
    return validName;
  }

  function changeNick(message) {
    if (message.substring(0,6).toLowerCase() == "/nick ") {
      var newNick = message.substring(6);
      if (newNick.length < 16 && newNick.length >= 3 && newNick.split(" ").length == 1 && validName(newNick)) {
        var oldNick = username;
        socket.emit('nick change', {
          newNick: newNick,
          oldNick: oldNick
        });
      } 
      else {
        log("Nickname must be 3-16 characters and contain no spaces/special characters.");
      }
    }
    return false;
  }

  function setPrivilege(message) {
    message = message.split(" ");
    if(message[0] == "/privilege" && message[2] == parseInt(message[2]) && message.length == 4){
      socket.emit('set privilege', {username: message[1], privilege: message[2], password: message[3]});
    }
    else if(message[0].toLowerCase() == "/privilege"){
      log("Unable to parse command. Usage: /privilege <name> <value> <password>");
    }
  }

  function users(message) {
    if(message.toLowerCase() == "/users")
      socket.emit('list users');
  }

  function deleteMessages(message){ 
    message = message.split(" ");
    if(message[0].toLowerCase() == "/delete" && message.length == 2)
      socket.emit('delete messages', message[1]);
  }

  function banUser(message) {
    message = message.split(" ");
    if(message[0].toLowerCase() == "/ban" && message[2] == parseInt(message[2]) && message.length == 3){
      socket.emit('ban user', {username: message[1], time: message[2]});
    }
  }
  
  function unbanUser(message) {
    message = message.split(" ");
    if(message[0].toLowerCase() == "/unban" && message.length == 2){
      socket.emit('unban user',message[1]);
    }
  }

  function chatAlert(message) {
    if (message.substring(0,7).toLowerCase() == "/alert ") {
      var alertMessage = message.substring(7);
      // alert(alertMessage);
      socket.emit('chat alert', {
          alertMessage: alertMessage
      });
      log("You have set the alert message to: " + alertMessage + "")
    } else {
      return false;
    }
  }


  // Sets the client's username
  function setUsername () {
    username = generateNickname();

    // If the username is valid
    if (username) {
      // $loginPage.fadeOut();
      // $chatPage.show();
      // $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add user', username);
    }
  }

  function filterMessage(message){
    var myMessage = message.split(" ");
    for(var i in myMessage){
      if(myMessage[i].toLowerCase().substring(0,6) == "donald")
        myMessage[i] = "Notorious";
      if(myMessage[i].toLowerCase().substring(0,5) == "trump")
        myMessage[i] = "Lex Luthor";
      if(myMessage[i].toLowerCase().substring(0,6) == "nigger")
        myMessage[i] = "chocolate american";
      if(myMessage[i].toLowerCase().substring(0,7) == "niggers")
        myMessage[i] = "chocolate americans";
      if(myMessage[i].toLowerCase().substring(0,7) == "liberal")
        myMessage[i] = "hippie";
      if(myMessage[i].toLowerCase().substring(0,8) == "liberals")
        myMessage[i] = "hippies";
      if(myMessage[i].toLowerCase().substring(0,10) == "republican")
        myMessage[i] = "inbred";
      if(myMessage[i].toLowerCase().substring(0,11) == "republicans")
        myMessage[i] = "inbreds";
      if(myMessage[i].toLowerCase().substring(0,4) == "cuck")
        myMessage[i] = "wet noodle";
      if(myMessage[i].toLowerCase().substring(0,5) == "cucks")
        myMessage[i] = "wet noodles";
      if(myMessage[i].toLowerCase().substring(0,6) == "skates")
        myMessage[i] = "knife shoes";
      if(myMessage[i].toLowerCase().substring(0,5) == "obama")
        myMessage[i] = "black science man";
      if(myMessage[i].toLowerCase().substring(0,7) == "hillary")
        myMessage[i] = "monica";
      if(myMessage[i].toLowerCase().substring(0,7) == "clinton")
        myMessage[i] = "lewinsky";
      if(myMessage[i].toLowerCase().substring(0,3) == "jew")
        myMessage[i] = "jewish american";
      if(myMessage[i].toLowerCase().substring(0,4) == "jews")
        myMessage[i] = "jewish americans";
      if(myMessage[i].toLowerCase().substring(0,6) == "muslim")
        myMessage[i] = "sandy american";
      if(myMessage[i].toLowerCase().substring(0,7) == "muslims")
        myMessage[i] = "sandy americans";
      if(myMessage[i].toLowerCase().substring(0,9) == "terrorist")
        myMessage[i] = "nhl player";
      if(myMessage[i].toLowerCase().substring(0,10) == "terrorists")
        myMessage[i] = "nhl players";
      if(myMessage[i].toLowerCase().substring(0,6) == "adolph")
        myMessage[i] = "joey";
      if(myMessage[i].toLowerCase().substring(0,6) == "hitler")
        myMessage[i] = "spaghetti";
      // if(myMessage[i].toLowerCase().substring(0,10) == "good vibes") // invalid because spaces
      //   myMessage[i] = "SLAYER";
      // THIS FUCKING SHIT DOES NOT WORK
      // if(myMessage[i].toLowerCase().substring(0,119) == '"href="https://www.facebook.com/groups/hockeytownHD/"target="_blank">https://www.facebook.com/groups/hockeytownHD/</a>"') {
      //   myMessage[i] = "fuck me";
      // }
    }
    message = "";
    for(var i in myMessage){
      message += (myMessage[i] + " ");
    }
    message = message.replace(/^\s+|\s+$/g, "");
    return message;
  }

  // Sends a chat message
  function sendMessage () {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');

      // chat command parsing
      if (chatCommand(message)) {
        // if (changeNick(message)) {
        //   var newNick = changeNick(message);
        //   log("your name is now " + newNick);
        //   username = newNick;
        // }
      } else if (message.length <= 300) {
        message = filterMessage(message);
        // addChatMessage({
        //   username: username,
        //   message: message
        // });
        // tell server to execute 'new message' and send along one parameter
        socket.emit('new message', message);
      } else {
        log("Max message length is 300 characters");
      }
    }
  }

  // Log a message
  function log (message, options) {
    var $el = $('<li>').addClass('log').html(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  function addChatMessage (data, options) {
    var $usernameDiv = $('<span class="username"/>')
      .html(data.user)
      .css('color', getUsernameColor(data.user));
    if (data.username == username) {
      $usernameDiv.css('text-decoration', 'underline');
    }
    if (data.flair) {
      $usernameDiv.prepend('<div class="flair ' + data.flair + '">');
    }
    if (data.message.substr(0,1) == '>') { // meme arrows
      var $messageBodyDiv = $('<span class="messageBody green-text">')
      .html(data.message);
    } else {
    var $messageBodyDiv = $('<span class="messageBody">')
      .html(data.message).attr("title", data.timeStamp);
    }

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)

      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  function cleanInput (input) {
    // return $('<div/>').text(input).text();
    var sanitized = input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    return linkify(sanitized);
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events

  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        // socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  // $inputMessage.on('input', function() {
  //   updateTyping();
  // });

  // Click events

  // Focus input when clicking anywhere on login page
  // $loginPage.click(function () {
  //   $currentInput.focus();
  // });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });

  // Socket events

  // Whenever the client connects successfully
  socket.on('connect', function () {
    $(".video-loading").hide();
    // alert(generateNickname());
    $loginPage.fadeOut();
    $chatPage.show();
    $loginPage.off('click');
    $currentInput = $inputMessage.focus();
    // Tell the server your username
    socket.emit('add user', username);
    // socket.emit('list users');
  });

var player;
function create_player(src) {
  if (player) player.destroy();

  player = new Clappr.Player({
    source: src, 
    parentId: "#local",
    autoPlay: true,
    height: "100%",
    width: "100%",
    poster: "https://31.media.tumblr.com/2db442f461864b529cabdfc27a9f07f9/tumblr_n6ukzroesr1r2geqjo1_500.gif",
    events: {
      onError: function() {
        alert("404");
      }
    }
  });

  // player.on(Clappr.Events.PLAYER_STOP, function () {
  //     is_playing = false;
  // });
}

  // Lowest view count server
  socket.on('set server', function(data) {
    if (reconnected == 0) {
      $("#current-server").text(data.feedName);

      feedUrl = data.feedUrl;
      lastFeedUrl = data.feedUrl;

      $('#stream-select').removeAttr('disabled');
      create_player(feedUrl);
      socket.emit("connected to", feedUrl);

      // if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) {
      //   feedUrl = data.feedUrl;
      //   lastFeedUrl = data.feedUrl;
      //   $('#stream-select').removeAttr('disabled');
      //   $('#local').attr('src', feedUrl);
      //   $('#local').get(0).play();
      //   socket.emit("connected to", feedUrl);
      // } else {
      //   // fires when client is using non-safari browsers
      //   if(Hls.isSupported()) {
      //     var video = document.getElementById('local');
      //     var hls = new Hls();
      //     feedUrl = data.feedUrl;
      //     lastFeedUrl = data.feedUrl;
      //     hls.loadSource(feedUrl);
      //     hls.attachMedia(video);
      //     hls.on(Hls.Events.MANIFEST_PARSED,function() {
      //       $('#stream-select').removeAttr('disabled');
      //       video.play();
      //       socket.emit("connected to", feedUrl);
      //     });
      //     hls.on(Hls.Events.ERROR, function (event, data) {
      //       var errorType = data.type;
      //       var errorDetails = data.details;
      //       var errorFatal = data.fatal;
      //       if (errorDetails == "manifestLoadError") { // we are offline
      //         $("#stream-offline").show();
      //       }
      //     });
      //   }
      // }
    }
  });

  // Whenever the server emits 'login', log the login message
  socket.on('login', function () {
    connected = true;
    // Display the welcome message
    if (reconnected != 1) {
      var message = "Your nick is " + username;
    }
    log("Type \'/nick whatever\' to change your nickname", {append: true});
    log("Type \'/flair\' to change your flair", {append: true});
    log(message, {
      append: true
    });
  });

  socket.on('ban user', function(data){
    if(data.success == 1)
      log("Banned user " + data.username + " for " + data.time + " minutes.");
    else if(data.success == 2)
      log("Specified user not found.");
    else
      log("You do not have access to this command.");
  });

  socket.on('unban user', function(data){
    if(data == 1)
      log("Successfully unbanned user");
    else if(data == 2)
      log("User not online, cannot unban");
    else
      log("You do not have access to unban users.");
  });

  socket.on('set privilege', function(data){
    if(data)
      log("Successfully set user privilege level.");
    else
      log("Could not set user privilege level.");
  });

  var firstChatAlert = 1;
  socket.on('chat alert', function(data){
    if(data) {
      $("#chat-alert .alert-message").html(data);
      $('.alert-message').marquee({
          //speed in milliseconds of the marquee
          duration: 5000,
          //gap in pixels between the tickers
          gap: 50,
          //time in milliseconds before the marquee will start animating
          delayBeforeStart: 0,
          //'left' or 'right'
          direction: 'left',
          //true or false - should the marquee be duplicated to show an effect of continues flow
          duplicated: false
      });
      if (firstChatAlert == 0) {
        $("#chat-alert").addClass("chat-alert-anim");
        setTimeout(function () { // needs a delay for the animation to run
          $('#chat-alert').removeClass('chat-alert-anim');
        }, 2500);
      }
      firstChatAlert = 0;
    }
    else
      log("You do not have access to this command.");
  });


  socket.on('nick change', function (data) {
    if(data.success && !data.clientSocket){
      log(data.oldNick + " has changed their name to " + data.newNick);
    }
    else if(data.success && data.clientSocket){
      username = data.newNick;
      log("You have changed your name to " + data.newNick);
    }
    else
      log("Username change failed, username already in use.");
  });
  
  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) {
    if(data.success == 0)
       log("Message length greater than 300 characters. Please type a shorter message.");
    else
      addChatMessage(data);
  });

  socket.on('init relays', function (data) {
    relayList = data;
    generateUI();
    updateCounts();
  });

  socket.on('update relays', function (data) {
    relayList = data;
    updateCounts();
  });

  socket.on('disconnect', function () {
    log('you have been disconnected');
  });

  socket.on('reconnect', function () {
    log('you have been reconnected');
    if (username) {
      socket.emit('add user', username);
    }
    reconnected = 1;
    if (feedUrl) {
      socket.emit('connected to', feedUrl);
    }
  });

  socket.on('reconnect_error', function () {
    log('attempt to reconnect has failed');
  });

  socket.on('spam warning', function(data) {
    log('You are flooding the server, you have ' + data.penalties + '/' + data.maxPenalties + ' warnings before you receive a ' + data.banTime + ' minute ban.');
  });

  socket.on('list users', function(data) {
    log(data);
  });  


  socket.on('delete messages', function(data){
    if(data.result){
      var searchTerm = "span.username:contains(" + data.user + ")"; 
      var userMessages = $("ul.messages").find("li").find(searchTerm).parent().remove();
      log("Pruned messages by user: " + data.user);
    }
    else
      log("You do not have access to delete user messages.");
  });

  socket.on('banned user', function(data) {
    log('Message send failed. You are currently banned for ' + data + ' minutes.');
  });

  // window.onbeforeunload = function() {
  //     socket.emit('disconnected from', feedUrl);
  // };

  $("body").on('click', ".username", function(){ 
    $('.inputMessage').val($('.inputMessage').val() + $(this).text());
    $('.inputMessage').focus();
  });

  $("body").on('click', ".close-chat", function(){ 
    $('.chat-container').addClass("hide-chat-anim");
    $('.stage').css("background", "#000");
    $('.chat-expand').css("opacity", "1");
    $('.chat-expand').show();
  });

  $("body").on('click', ".chat-expand", function(){ 
    $('.chat-container').removeClass("hide-chat-anim");
    $('.stage').css("background", "transparent");
    $('.chat-expand').css("opacity", "0");
    $('.chat-expand').hide();
  });
  $('.chat-expand').hide();


  // chat settings stuff

  $("body").on('click', "#chat-settings-btn", function(){
    if ($("#chat-settings-btn").hasClass("oi-cog")) { // open
      $('#chat-settings').show();
      $('#chat-settings-btn').removeClass("oi-cog");
      $('#chat-settings-btn').addClass("oi-x");

      $("#user-list").empty();
      socket.emit('list users');
      currentUsers.sort();
      for (var i=0;i<currentUsers.length;i++){
        $('<option/>').val(currentUsers[i]).html(currentUsers[i]).appendTo('#user-list');
      }
    } else {                                          // close
      $('#chat-settings').hide();
      $('#chat-settings-btn').removeClass("oi-x");
      $('#chat-settings-btn').addClass("oi-cog");
    }
  });

  $("body").on("click", "#flair-picker-btn", function(){
    $("#flair-picker").show();
  });

  $("#current-relay").text(connectDomain);

// This shit never works
  // $.ajax({
  //     url:'https://east1.scum.systems/hls/stream.m3u8',
  //     type:'HEAD',
  //     error: function()
  //     {
  //       $("#stream-offline").show();
  //       // alert("404");
  //     },
  //     success: function()
  //     {
  //         //file exists
  //     }
  // });

});
