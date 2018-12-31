// Gabrielle Latreille (101073284)
// Umai Balendra (101080788)

const app = require("http").createServer(handler);
const io = require("socket.io")(app);
const fs = require("fs"); //need to read static files
const url = require("url"); //to parse url strings

const PORT = process.env.PORT || 3000
app.listen(PORT)

const ROOT_DIR = "html"; //dir to serve static files from

const MIME_TYPES = {
  css: "text/css",
  gif: "image/gif",
  htm: "text/html",
  html: "text/html",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "application/javascript",
  json: "application/json",
  png: "image/png",
  txt: "text/plain"
};

function get_mime(filename) {
  let ext, type
  for (let ext in MIME_TYPES) {
    type = MIME_TYPES[ext]
    if (filename.indexOf(ext, filename.length - ext.length) !== -1) {
      return type
    }
  }
  return MIME_TYPES["txt"]
}


function handler(request, response) {
  let urlObj = url.parse(request.url, true, false)

  fs.readFile(ROOT_DIR + urlObj.pathname, function(err, data) {
    if (err) {
      //report error to console
      console.log('ERROR: ' + JSON.stringify(err))
      //respond with not found 404 to client
      response.writeHead(404);
      response.end(JSON.stringify(err))
      return
    }
    response.writeHead(200, {
      'Content-Type': get_mime(ROOT_DIR + urlObj.pathname)
    })
    response.end(data)
  });
}

var playerNum = 0; //used for username
var usernameList = {}; //store the usernames here

//ball and player objects
var ball = {
  x: 475,
  y: 315,
  size: 10,
  xSpeed: Math.random() + 6,
  ySpeed: Math.random() + 6
};

var player1 = {
  x: 20,
  y: 315,
  width: 8,
  height: 64,
  username: null,
  colour: "white",
  score: 0
};

var player2 = {
  x: 922,
  y: 315,
  width: 8,
  height: 64,
  username: null,
  colour: "white",
  score: 0
}

//status of player buttons
var buttonStatus = {
  b1: false,
  b2: false
}

//ASCII code
var UP_ARROW = 38;
var DOWN_ARROW = 40;

var timer = setInterval(moveBall, 50);

//establish a connection with the client:
io.on('connection', function(socket) {

  //server is told by client to create a new user at the current socket
  socket.on('adduser', function() {
    usernameList["person" + playerNum] = "person" + playerNum; //add key to array
    socket.username = "person" + playerNum;
    //^^set the username to a default so it isn't just null
    playerNum++; //increment for the player username to be unique each time
    sync();
    setColour();
  });

  //server is told by client that the current socket wants to be player 1
  socket.on('becomePlayer1', function() {
    //if player 1 is available and the current socket is not player 2
    if (player1.username == null && socket.username != player2.username) {
      player1.username = socket.username;
      buttonStatus.b1 = true; //make button clickable
      var dataObj = {
        leave: false
      };
      var jsonString = JSON.stringify(dataObj);
      socket.emit('setButtonLeave', jsonString); //send dataObj to client
      setColour();
      buttonStateSync();
    }
  });

  //server is told by client that the current socket wants to be player 2
  socket.on('becomePlayer2', function() {
    //if player 2 is available and the current socket is not player 1
    if (player2.username == null && socket.username != player1.username) {
      player2.username = socket.username;
      buttonStatus.b2 = true;

      var jsonString = JSON.stringify({
        leave: false
      });

      socket.emit('setButtonLeave', jsonString);
      setColour(); //set that player's paddle colour
      buttonStateSync(); //sync info for all users to see updated buttons
    }
  });

  //server receives data sent from client when a key has been pressed
  socket.on('keyPressed', function(data) {
    if (socket.username == player1.username) {
      movePaddleLeft(data); //move leftmost paddle if user is p1
    } else if (socket.username == player2.username) {
      movePaddleRight(data); //move rightmost paddle if user is p2
    }
  });

  //when there is a disconnection
  socket.on('disconnect', function() {
    //if the socket and player1 username are the same
    if (socket.username == player1.username) {
      player1.score = 0;
      player2.score = 0;
      player1.username = null;
      buttonStatus.b1 = false;
      setColour();
      buttonStateSync();
      reset();
      scoreSync();
    } else if (socket.username == player2.username) {
      player1.score = 0;
      player2.score = 0;
      player2.username = null;
      buttonStatus.b2 = false;
      setColour();
      buttonStateSync();
      reset();
      scoreSync();
    }

    //update storage of users by deleting the person that left that left
    delete usernameList[socket.username];
  });

});


//function to take care of ball movement calculations
function moveBall() {
  if (player1.username != null && player2.username != null) {
    ball.x += ball.xSpeed;
    ball.y += ball.ySpeed;

    //do ball/wall collisions for x:
    if (ball.x < 0 + ball.size) {
      player2.score++;
      ball.xSpeed *= -1; //make ball move in opposite x
      reset();
      scoreSync(); //update score displayed
    } else if (ball.x > 950 - ball.size) {
      player1.score++;
      ball.xSpeed *= -1; //make ball move in opposite x
      reset();
      scoreSync(); //update score displayed
    }

    //if the ball goes outside of the wall y
    if (ball.y < 0 + ball.size || ball.y > 635 - ball.size) {
      ball.ySpeed *= -1; //makes it move in opposite y
    }

    //do paddle collisions horizontally, while checking that it is within
    //the paddle's dimensions:
    if (((ball.x - 10 < player1.x + player1.width) &&
        (ball.y > player1.y && ball.y < player1.y + player1.height)) ||
      ((ball.x + 10 > player2.x) &&
        (ball.y > player2.y && ball.y < player2.y + player2.height))) {
      ball.xSpeed *= -1; //switch movement direction
    }

    dataObj = {
      x: ball.x,
      y: ball.y
    }

    jsonString = JSON.stringify(dataObj);
    io.emit('ballSync', jsonString); //emit to everyone
  }
}

//function to shift leftmost paddle based on data given
function movePaddleLeft(data) {
  var keyPressed = JSON.parse(data);
  if (keyPressed.key == UP_ARROW && player1.y > 0) {
    player1.y -= 10;
  } else if (keyPressed.key == DOWN_ARROW && player1.y + player1.height < 635) {
    player1.y += 10;
  }

  dataObj = {
    y: player1.y
  }

  jsonString = JSON.stringify(dataObj);
  io.emit('player1Sync', jsonString); //emit to everyone
}

//function to shift rightmost paddle based on given data
function movePaddleRight(data) {
  var keyPressed = JSON.parse(data);
  if (keyPressed.key == UP_ARROW && player2.y > 0) {
    player2.y -= 10;
  } else if (keyPressed.key == DOWN_ARROW && player2.y + player2.height < 635) {
    player2.y += 10;
  }
  dataObj = {
    y: player2.y
  }

  jsonString = JSON.stringify(dataObj);
  io.emit('player2Sync', jsonString); //emit to everyone
}

//function to display game score below canvas
function scoreSync() {
  dataObj = {
    score1: player1.score,
    score2: player2.score
  }
  var jsonString = JSON.stringify(dataObj);
  io.emit('scoreChange', jsonString)
}

//send button information to the client
function buttonStateSync() {
  var dataObj = {
    b1: buttonStatus.b1,
    b2: buttonStatus.b2
  }
  jsonString = JSON.stringify(dataObj);
  io.emit('setPlayerButtons', jsonString);
}

//function to give everyone the current info about paddle and ball locations
function sync() {
  buttonStateSync();
  scoreSync();
  dataObj = {
    player1y: player1.y,
    player2y: player2.y,
    ballx: ball.x,
    bally: ball.y
  }
  jsonString = JSON.stringify(dataObj);
  io.emit('syncAll', jsonString); //emit to everyone
}

//reset the ball and paddle positions to their defaults
function reset() {
  player1.y = 315;
  player2.y = 315;
  ball.x = 475;
  ball.y = 315;
  sync();
}

//function to set respective user paddle colours,
//to show that the paddle is now TAKEN!
function setColour() {
  if (player1.username != null && player2.username != null) {
    dataObj = {
      paddle1: "CornflowerBlue",
      paddle2: "DarkOrchid"
    }
  } else if (player1.username != null) {
    dataObj = {
      paddle1: "CornflowerBlue",
      paddle2: "white"
    }
  } else if (player2.username != null) {
    dataObj = {
      paddle1: "white",
      paddle2: "DarkOrchid"
    }
  }

  jsonString = JSON.stringify(dataObj);
  io.emit('changeColour', jsonString);

}
console.log("Server Running at http://localhost:3000/assignment3.html  CNTL-C to quit");
