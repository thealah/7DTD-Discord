////// # Requirements and Initialization # //////
const Discord = require("discord.js");
const client = new Discord.Client();
const minimist = require('minimist');

var telnet = require('telnet-client');
connection = new telnet();

doReconnect = 1;

////// # Arguments # //////

argv = require('minimist')(process.argv.slice(2));

// IP
// This argument allows you to run the bot on a remote network.
// For debugging purposes only.
if(typeof argv.ip === 'undefined')
  ip = "localhost";
else
  ip = argv.ip;

// Port
if(typeof argv.port === 'undefined')
  port = 8081; // If no port, default to 8081
else
  port = argv.port;

// Telnet Password
if(typeof argv.password === 'undefined') {
  console.log("ERROR: No telnet password specified!");
  process.exit();
}
pass = argv.password;

// Discord token
if(typeof argv.token === 'undefined') {
  console.log("ERROR: No Discord token specified!");
  process.exit();
}
token = argv.token;

// Discord channel
if(typeof argv.channel === 'undefined') {
  console.log("ERROR: No Discord channel specified!");
  process.exit();
}
channelid = argv.channel.toString();

////// # Telnet # //////
params = {
  host: ip,
  port: 8081,
  // Timeout is set to 10 minutes, just in case.
  // Note: The game's timeout appears to be 15.
  timeout: 600000,
  username: '',
  password: pass,

  passwordPrompt: /Please enter password:/i,
  shellPrompt: /\r\n$/,

  debug: false,
};

//var cmd = 'say "--telnet connected--"';
var cmd = 'version';

connection.on('ready', function(prompt) {
  console.log("Connected to game. (" +  Date() + ")");
});

connection.on('failedlogin', function(prompt) {
    console.log("Login to game failed! (" +  Date() + ")");
});

connection.on('timeout', function() {
  console.log('Connection to game timed out. This is normal if the server is empty. Reconnecting...');
  connection.end();
  setTimeout(function(){ connection.connect(params); }, 5000);
});

connection.on('close', function() {
  console.log('Connection to game closed.');

  if(doReconnect)
  {
    connection.end(); // Just in case
    setTimeout(function(){ connection.connect(params); }, 5000);
  }
});

connection.on('data', function(data) {
  data = data.toString();
  var lines = data.split("\n");

  for(var i = 0; i <= lines.length-1; i++)
  {
    //console.log("*LINE" + " " + i + " " + lines[i]);
    var line = lines[i];

    handleMsgFromGame(line);
  }
});

connection.on('error', function(data) {
  //console.log(data);
  console.log("Connection to game FAILED with error: " + data.code + " (" +  Date() + ")");
});

connection.connect(params);

////// # Discord # //////
client.login(token);

client.on('ready', () => {
  console.log('Connected to ' + client.guilds.size + ' Discord servers.');
  client.user.setGame("7DTD||Type 7dtd!info");

  channel = client.channels.find("id", channelid);
});

client.on('message', function(msg) {
  if((msg.channel == channel || msg.channel.type == "dm") && msg.author != client.user) {
    if(msg.toString().toUpperCase().startsWith("7DTD!"))
      parseDiscordCommand(msg);
    else if(msg.channel.type == "text") {
      msg = "[" + msg.author.username + "] " + msg.cleanContent;
      console.log(msg);
      handleMsgToGame(msg);
    }
  }
});

function parseDiscordCommand(msg)
{
  var cmd = msg.toString().toUpperCase().replace("7DTD!", "");
  if(cmd == "INFO" || cmd == "I" || cmd == "HELP" || cmd == "H")
    msg.author.send("**Info:** This bot relays chat messages to and from a 7 Days to Die server. Commands are accepted in DMs as well.\n**Source code:** https://github.com/LakeYS/7DTD-Discord-Integration\n**Commands:** 7dtd!info, 7dtd!time (coming soon)");
}

////// # Functions # //////
function handleMsgFromGame(line) {
  var split = line.split(" ");
  var type = split[3];

  if(type == "Chat:" || type == "GMSG:") {
    // Make sure the channel exists.
    if(channel !== null) {
      // Cut off the timestamp and other info
      var msg = split[4];
      for(var i = 5; i <= split.length-1; i++)
        msg = msg + " " + split[i];

      // Convert it to Discord-friendly text.
      // TODO: Fix bug where users can circumvent this by having
      // an apostrophe in their screen name.
      msg = msg.replace("'","").replace("'","");

      channel.send(msg);
      //console.log(msg);
    }
  }
}

function handleMsgToGame(line) {
  connection.exec("say \"" + line + "\"", function(err, response) {
    handleMsgFromGame(response);
  });
}

////// # Console Input # //////
process.stdin.on('data', function (text) {
  if(text.toString() == "stop\r\n" || text.toString() == "exit\r\n" || text.toString() == "stop\n" || text.toString() == "exit\n")
    process.exit();
  else if(text.toString() == "help\r\n" || text.toString() == "help\n")
    console.log("This is the console for the Discord bot. It currently only accepts JavaScript commands for advanced users. Type 'exit' to shut it down.");
  else
    eval(text.toString());
});

process.on('exit',  () => {
  doReconnect = 0;
  client.destroy();
});

process.on('uncaughtException', (err) => {
  console.log(err);

  console.log("An error occurred. Reconnecting...");
  client.destroy();
  setTimeout(function(){ client.login(token); }, 2000);
});
