// Setup basic express server
var express = require('express');
var app = express();
var https = require('https');
var fs = require('fs');
const ipify = require('ipify');
var redis = require('socket.io-redis');
var mysql = require('mysql');
var pool = mysql.createPool({
  connectionLimit: 20,
  host: '107.170.246.161',
  user: 'root',
  password: '3?Dxv6Fv%m-3',
  database: 'hellco_video'
});
var geoip = require('geoip-lite');
var connectedUsers = [];
var bannedIP = [];
var alertMessage = "damn son, where'd you find this?";
var flairs = ["teamari", "teambos", "teambuf", "teamcar" ,"teamcbj", "teamcgy", "teamchi", "teamcol", "teamdal", "teamdet",
 "teamedm", "teamfla", "teamlak", "teammin", "teammtl", "teamnjd", "teamnsh", "teamnyi", "teamnyr", "teamott", "teamphi",
  "teampit", "teamsjs", "teamstl", "teamtbl", "teamtor", "teamvan", "teamwpg", "teamwsh"];

// JSON server list
var relayList = require('./servers.json');
var config = require('./config.json');
// We are finding the ip of the server that this file is running on,
// finding the corresponding domain,
// and writing as a variable in domain.js which main.js can read
ipify((err, ip) => { // If this fails the server wont run lol
var foundDomain;

  // Check all the ips in server.json
  for (var i in relayList.server) {
    if (ip == relayList.server[i].ip) {
      foundDomain = relayList.server[i].domain;
    }
  }
  // servers.json doesn't list the front-end server so we have to check outisde of the loop
  if (ip == "107.170.246.161")
    foundDomain = "scum.systems";

  var options = {
    key: fs.readFileSync('/etc/letsencrypt/live/'+foundDomain+'/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/'+foundDomain+'/fullchain.pem'),
    dhparam: fs.readFileSync('/etc/ssl/certs/dhparam.pem')
  };
  var server = https.createServer(options, app);
  server.listen(3000);
  var io = require('socket.io')(server);
  io.adapter(redis({ host: '107.170.246.161', port: 6379, password: 'GhgUYG$*jhfdh549F7td7*&^%ggfdhu^&Rusdfg&^R' }));


  var connectDomain = 'var connectDomain = "' + foundDomain + '";';
  var writeOptions = { flag : 'w' };
  fs.writeFile('./public/js/domain.js', connectDomain, writeOptions, function(err) {
      if (err) throw err;
      console.log('Wrote domain to domain.js');
  });


  // Routing
  app.use(express.static(__dirname + '/public'));

  // Chatroom

  var numUsers = 0;
  io.on('connection', function (socket) {
    
    var addedUser = false;
    //Send initial viewer counts to client on connection
    var sql = "SELECT streamurl, COUNT(distinct userID) as viewCount from users group by streamurl";
    pool.query(sql, function(error, results, fields){
      if(error) throw error;
      relayList.viewers = results;
      socket.emit('init relays', relayList)
    });

    // Check if the user has an expired ban
    function updateBans() {
      var myDate = new Date();
        var sql = "DELETE FROM banlist WHERE expiretime < " + myDate.getTime();
        pool.query(sql, function(error, results, fields){
          if(error) throw error;
        });
    }
    // Set the initial alert message
    socket.emit('chat alert', alertMessage);
    var sql = "SELECT * FROM lastmessages";
    pool.query(sql, function(error, results, fields) { 
      if(error) throw error;
      for(var i in results){
        socket.emit('new message', results[i]);
      }
    });

    //Update view counter
    function updateCount(){
      var sql = "SELECT streamurl, COUNT(distinct userID) as viewCount from users group by streamurl";
      pool.query(sql, function(error, results, fields){
        if(error) throw error;
        relayList.viewers = results;
        socket.emit('update relays', relayList);
      });
    }

    // Find least populated server
    function setServer() {
      var address = socket.handshake.address;
      var location = geoip.lookup(address);
      var initURL = relayList.server[0].url;
      var initip = relayList.server[0].ip;
      var cleanName = relayList.server[0].cleanName;
      var region = relayList.server[0].location;
      var sql = "SELECT streamurl, COUNT(distinct userID) as viewCount from users group by streamurl";
      pool.query(sql, function(error, results, fields){
        var viewers = 0;
        for(var j in results){
          if(results[j].streamurl == relayList.server[0].url)
             viewers = results[j].viewCount;
        }
        for(var i in relayList.server){
           var feedloc = geoip.lookup(relayList.server[i].ip);
           var urlloc = geoip.lookup(initip);
           if(Math.sqrt(Math.abs(feedloc.ll[0] - location.ll[0])^2 + Math.abs(feedloc.ll[1] - location.ll[1])^2) < Math.sqrt(Math.abs(urlloc.ll[0] - location.ll[0])^2 + Math.abs(urlloc.ll[1] - location.ll[1])^2)){
              region = relayList.server[i].location;
              initip = relayList.server[i].ip;
              initURL = relayList.server[i].url
              cleanName = relayList.server[i].cleanName;
              for(var j in results){
                if(results[j].streamurl == relayList.server[i].url)
                  viewers = results[j].viewCount;
              }
           }
       }
       for(var i in relayList.server){
            if(relayList.server[i].location == region){
              var emptyServer = 1;
              for(var j in results){
                if(relayList.server[i].url == results[j].streamurl){
                  emptyServer = 0;
                  if(results[j].viewCount < viewers){
                    initURL = relayList.server[i].url
                    initip = relayList.server[i].ip;
                    cleanName = relayList.server[i].cleanName;
                    viewers = results[j].viewCount;
                  }
                }
              }
              if(emptyServer){
                viewers = 1;
                initURL = relayList.server[i].url
                initip = relayList.server[i].ip;
                cleanName = relayList.server[i].cleanName;
              }
           }
        }
        socket.emit('set server', {
          feedUrl: initURL ,
          feedName: cleanName
        });
      });
    }

    // Add specified user to banlist for specified time
    function banUser(iusername, itime){
      var currTime = new Date();
      var banTime = new Date(currTime.getTime() + (itime * 60000));
      var sql = "SELECT * FROM users WHERE user='" + iusername + "'";
      pool.query(sql, function(error, results, fields){
        if(error) throw error;
        if(results.length){
        for(var i in results){
          sql = "INSERT INTO banlist(ip, expiretime) VALUES('" + results[i].ipAddr + "'," + banTime.getTime() + ")";
          pool.query(sql, function(error, results, fields){
            if(error) throw error;
            var currTime = new Date();
            io.sockets.emit('ban user', {success: 1, username: iusername, time: itime});
          });
        }
       }
       else
         socket.emit('ban user', {success: 2});
      });
      return 2;
    }

    // Search banlist and remove specified user if found
    function unbanUser(iusername){
      var sql = "SELECT * FROM users WHERE user ='" + iusername + "'";
      pool.query(sql, function(error, results, fields){
        if(error) throw error;
        if(results.length){
        for(var i in results){
          sql = "DELETE FROM banlist WHERE ip='" + results[i].ipAddr + "'";
          pool.query(sql, function(error, results, fields){
            if(error) throw error;
            socket.emit('unban user', 1);
          });
        }
        }
        else
          socket.emit('unban user', 2);
      });
    }

    // Client requests update of viewer counts
    socket.on("request relays", function() {
      updateCount();
    });

    // Delete chat messages by specified user
    socket.on('delete messages', function(data){
      var sql = "SELECT * FROM users WHERE userID='" + socket.id + "'";
      pool.query(sql, function(error, results, fields){
        if(error) throw error;
        if(results.length && results[0].userPrivilege >= 2){
          io.sockets.emit('delete messages', {result: 1,user: data});
          sql = "DELETE FROM lastmessages WHERE user='" + data + "'";
          pool.query(sql, function(error, results, fields){
            if(error) throw error;
          });
        }
        else socket.emit('delete messages', {result: 0});
      });
    });

    // Update chat alert message
    socket.on('chat alert', function(data){
      var sql = "SELECT * FROM users WHERE userID='" + socket.id + "'";
      pool.query(sql, function(error, results, fields){
        if(error) throw error;
        if(results.length && results[0].userPrivilege >= 1){
          io.sockets.emit('chat alert', data.alertMessage);
          alertMessage = data.alertMessage;
        }
        else socket.emit('chat alert', 0);
      });
    });

    // Chat command to ban user
    socket.on('ban user', function(data) {
      var sql = "SELECT * FROM users WHERE userID='" + socket.id + "'";
      pool.query(sql, function(error, results, fields){
        if(error) throw error;
        if(results.length && results[0].userPrivilege >= 2){
           banUser(data.username, data.time);
        }
        else socket.emit('ban user', {success: 0});
      });
    });

    // Chat command to unban user
    socket.on('unban user', function(data) {
      var sql = "SELECT * FROM users WHERE userID='" + socket.id + "'";
      pool.query(sql, function(error, results, fields){
        if(error) throw error;
        if(results.length && results[0].userPrivilege >= 2){
          var unbanResult = unbanUser(data);
        }
        else
          socket.emit('unban user', 0);
      });
    });

    // Client requests to switch to a different streaming server
    socket.on('switch stream', function (data) {
      // data.feedUrl data.lastFeedUrl
      for (var i in relayList.server) {
        if (relayList.server[i].url == data.feedUrl) {
          relayList.server[i].viewers++;
        }

        if (relayList.server[i].url == data.lastFeedUrl) {
          relayList.server[i].viewers--;
        }
      }
      // io.sockets.emit('update relays', relayList);
      socket.feedUrl = data.feedUrl;
      var sql = "UPDATE users SET streamurl ='" + socket.feedUrl + "' WHERE userID='" + socket.id + "'";
      pool.query(sql, function(error, results, fields){
        if(error) throw error;
      });
      console.log("    [SWITCHED] " + socket.id + ", " + socket.handshake.address + " : " + data.lastFeedUrl + " -> " + data.feedUrl);
    });

    // Client has connected to a stream server
    socket.on('connected to', function (feedUrl) {
      for (var i in relayList.server) {
        if (relayList.server[i].url == feedUrl) {
          relayList.server[i].viewers++;
        }
      }
      // io.sockets.emit('update relays', relayList);
      socket.feedUrl = feedUrl;
      if(feedUrl == null) feedUrl = relayList.server[0].url;
      var sql = "UPDATE users SET streamurl ='" + socket.feedUrl + "' WHERE userID='" + socket.id + "'";
      pool.query(sql, function(error, results, fields){
        if(error) throw error;
      });
      console.log("   [CONNECTED] " + socket.id + ", " + socket.handshake.address + " : " + feedUrl);
    });


    // legacy function, need to remove in the future
    socket.on('disconnected from', function (feedUrl) {
      for (var i in relayList.server) {
        if (relayList.server[i].url == feedUrl) {
          relayList.server[i].viewers--;
        }
      }
      // sends to everyone
      // io.sockets.emit('update relays', relayList);
      socket.feedUrl = feedUrl;
      console.log("[DISCONNECTED] " + socket.id + ", " + socket.handshake.address + " : " + feedUrl);
    });

    // when the client emits 'new message', this listens and executes
    socket.on('new message', function (data) {
      var timeStamp = new Date(); //timestamp for the new message
      updateBans(); //Check for and delete any expired bans
      // Query the new message sender for a current ban
      var sql = "SELECT * FROM banlist WHERE ip='" + socket.handshake.address + "'";
      pool.query(sql, function(error, results, fields){
        if(error) throw error;
        if(!results.length && data.length <= 300){ // If the user is not banned and the chat message is not too long
          io.sockets.emit('new message', {user: socket.username, message: data, flair: socket.flair}); // Publish the message

          // Query the database to see when the user last posted. If user is posting too fast, add penalty point
          sql = "SELECT * FROM users WHERE userID='" + socket.id + "'";
          pool.query(sql, function(error, results, fields){
            if(error) throw error;
            if(results.length){
              var penalties = results[0].userPenalty;
              if(timeStamp.getTime() - results[0].timeStamp < config.server.floodTime){
                 sql = "UPDATE users SET userPenalty = userPenalty + 1 WHERE userID='" + socket.id + "'";
                 pool.query(sql, function(error, results, fields){
                   if(error) throw error;
                   socket.emit('spam warning', {penalties: penalties + 1, maxPenalties: config.server.maxFloodPenalty, banTime: config.server.floodBanTime});
                   if(penalties + 1 >= config.server.maxFloodPenalty){ // If penalties exceed limit, ban and reset penalty points
                      banUser(socket.username, config.server.floodBanTime)
                      var sql = "UPDATE users SET userPenalty = 0 WHERE userID='" + socket.id + "'";
                      pool.query(sql, function(error, results, fields){
                        if(error) throw error;
                      });
                    }
                 });
              }
              // Log the time of posting the most recent message in the database
              sql = "UPDATE users SET timeStamp =" + timeStamp.getTime() + " WHERE userID='" + socket.id + "'";
              pool.query(sql, function(error, results, fields){
                if(error) throw error;
              });
            }
          });
          // Log the latest messages to the database
          sql = "INSERT INTO lastmessages(user, message, timestamp) VALUES('" + socket.username + "'," + pool.escape(data) + "," + timeStamp.getTime() + ")";
          pool.query(sql, function(error, results, fields){
            if(error) throw error;
          });
          // Delete oldest messages from the database until it equals the length limit
          sql = "SELECT COUNT(*) as cnt FROM lastmessages";
          pool.query(sql, function(error, results, fields){
            if(error) throw error;
            sql = "DELETE FROM lastmessages ORDER BY timestamp LIMIT 1";
            for(var i = 0; i < parseInt(results[0].cnt) - config.server.numInitMessages; ++i){
              pool.query(sql, function(error, results, fields){
                if(error) throw error;
              });
            }
          });
        }
        // Message was too long, inform client attempting to post
        else if(data.length > 300){
          socket.emit('new message', {success: 0});  
        }
        // User is banned, inform client attempting to post
        else
          socket.emit('banned user', (results[0].expiretime - timeStamp.getTime())/60000);
      });
    });

    // Chat command to set user privilege level
    socket.on('set privilege', function(data) {
      if(data.password == config.server.rcon_password){
        var sql = "UPDATE users SET userPrivilege=" + data.privilege + " WHERE user='" + data.username + "'";
        pool.query(sql, function(error, results, fields){
          if(error) throw error;
          if(results)
            socket.emit('set privilege', 1);
          else
            socket.emit('set privilege', 0);
        });
      }
    });

    // Chat command to list connected users
    socket.on('list users', function() {
      var sql = "SELECT * FROM users";
      pool.query(sql, function(error, results, fields) {
        if(error) throw error;
        var userList = [];
        for(var i in results)
          userList.push(" " + results[i].user);
        socket.emit('list users', userList);
      });
    });

    // Chat command to set team flair
    socket.on('set flair', function(flair) {
      if (flairs.indexOf(flair) >= 0) {
        socket.flair = flair;
      }
    });


    // when the client emits 'add user', this listens and executes
    socket.on('add user', function (username) {
      if (addedUser){ 
        var sql = "UPDATE users SET userID='" + socket.id + "' WHERE user='" + socket.username + "'";
        pool.query(sql, function(error, results, fields){
          if(error) throw error;
          return;
        });
      }

      // we store the username in the socket session for this client
      socket.username = username;
      addedUser = true;
      socket.emit('login');
      timeStamp = new Date();
      var sql = "INSERT INTO users(user, ipAddr, userID, userPrivilege, userPenalty, timeStamp) VALUES('" + socket.username + "'," + "'" + socket.handshake.address + "'," + "'" + socket.id + "'," + 0 + "," + 0 + "," + timeStamp.getTime() + ") ON DUPLICATE KEY UPDATE user ='" + socket.username + "'";
      pool.query(sql, function(error, results, fields) {
        if(error) throw error;
      });
      setServer();
    });

    // Client requested to change their nickname
    socket.on('nick change', function (data) {
      // Check if the requested nickname is taken
      var sql = "SELECT * FROM users WHERE user='" + data.newNick + "'";
      pool.query(sql, function(error, results, fields) {
        if(error) throw error;
        if(!results.length){ // Username was not taken, so update the old nick to the new nick
          sql = "UPDATE users SET user = REPLACE (user,'" + data.oldNick + "'," + "'" + data.newNick + "')";
          pool.query(sql, function(error, results, fields) {
            if(error) throw error;
            console.log(data.oldNick + " changed name to " + data.newNick);
          });
          socket.emit('nick change', {
            success: 1,
            clientSocket: 1,
            newNick: data.newNick,
            oldNick: data.oldNick
          });
            socket.broadcast.emit('nick change', {
            success: 1,
            clientSocket: 0,
            newNick: data.newNick,
            oldNick: data.oldNick
          });
          socket.username = data.newNick;
        }
        else{ // Username was already taken, inform the client
         socket.emit('nick change', {
          success: 0,
          clientSocket: 1,
          newNick: data.newNick,
          oldNick: data.oldNick
        });
        }  
      });
    });

    // when the user disconnects.. perform this
    socket.on('left stream', function (feedUrl) {
      console.log(socket.id + " disconnected: " + feedUrl);
      for (var i in relayList.server) {
        if (relayList.server[i].url == feedUrl) {
          // deincrement viewer count in json
          relayList.server[i].viewers--;
          console.log(relayList.server[i].cleanName +": "+ relayList.server[i].viewers);
          console.log("Total Viewers: "+ totalViewers());
        }
      }
    });


    socket.on('disconnect', function (feedUrl) {
      if (socket.feedUrl) {
        for (var i in relayList.server) {
          if (relayList.server[i].url == socket.feedUrl) {
            relayList.server[i].viewers--;
          }
        }
        // sends to everyone
        // io.sockets.emit('update relays', relayList);
        console.log("[DISCONNECTED] " + socket.id + ", " + socket.request.connection.remoteAddress.substr(7) + " : " + socket.feedUrl);
      }

      if (addedUser) {
        // echo globally that this client has left
        var sql = "DELETE FROM users WHERE user='" + socket.username + "'";
        pool.query(sql, function(error, results, fields){
          if(error) throw error;
        });
      }
    });
  });
});
//Graceful exiting - use option --killSignal=SIGTERM with forever.js
process.on('SIGINT', function(){
  console.log('\nExiting nodejs program gracefully');
  pool.end();
  process.exit();
});
process.on('SIGTERM', function(){
  console.log('\nExiting nodejs program gracefully');
  pool.end();
  process.exit();
});
