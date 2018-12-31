// Gabrielle Latreille (101073284)
// Umai Balendra (101080788)
//give the socket an address
var socket = io('http://' + window.document.location.host);

var canvas = document.getElementById("canvas1"); //our drawing canvas

//create objects to be our paddles and ball"
var paddleOne = {
  colour: "white",
  x: 20,
  y: 315,
  width: 8,
  height: 64
};

var paddleTwo = {
  colour: "white",
  x: 922,
  y: 315,
  width: 8,
  height: 64
};

var ball = {
  x: 475,
  y: 315,
  size: 10
};

var timer; //used for setInterval()

var drawCanvas = function() {

  var context = canvas.getContext("2d");

  //background
  context.fillStyle = "black";
  context.fillRect(0, 0, canvas.width, canvas.height); //erase canvas

  //middle line on canvas
  context.fillStyle = "white";
  context.fillRect(canvas.width / 2, 0, 2, canvas.height); //erase canvas

  //make rectangles for paddle one
  context.fillStyle = paddleOne.colour;
  context.fillRect(paddleOne.x, paddleOne.y, paddleOne.width, paddleOne.height);

  //make rectangles for paddle two
  context.fillStyle = paddleTwo.colour;
  context.fillRect(paddleTwo.x, paddleTwo.y, paddleTwo.width, paddleTwo.height);

  //make ball:
  context.beginPath();
  context.arc(ball.x, ball.y, ball.size, 0, 2 * Math.PI);
  context.fillStyle = "white";
  context.fill();
  context.strokeStyle = "white";
  context.lineWidth = 2;
  context.stroke();

};

//function to tell server that the socket wants to be player1
function becomePlayer1() {
  socket.emit('becomePlayer1')
}

//function to tell server that the socket wants to be player2
function becomePlayer2() {
  socket.emit('becomePlayer2')
}

function handleKeyDown(e) {

  dataObj = {
    key: e.which //e.which is ASCII code
  };

  jsonString = JSON.stringify(dataObj);
  //^send dataObj as a string representation
  socket.emit('keyPressed', jsonString);

}

$(document).ready(function() {
  //add keyboard handler to document
  $(document).keydown(handleKeyDown);
  timer = setInterval(drawCanvas, 50); //call drawCanvas() every tenth of a second
  // drawCanvas();
});

socket.on('connect', function() {
  //upon connection, send an alert to provide the user with instructions
  alert("Welcome to Pong! Please read the instructions below: \n" +
    "To play: Use the up/down arrow keys to move your paddle\n" +
    "To leave game: Simply click the 'Leave' button or " +
    "exit the current browser tab. \nTo join game: " +
    "Select player1 or player2 button if it is available! If not, you'll have to wait.");
  socket.emit('adduser');
});

socket.on('drawCanvas', function(data) {
  drawCanvas();
});

//to sync all of the locations of the paddles and balls
socket.on('syncAll', function(data) {
  var locationData = JSON.parse(data);
  paddleOne.y = locationData.player1y;
  paddleTwo.y = locationData.player2y;
  ball.x = locationData.ballx;
  ball.y = locationData.bally;
  drawCanvas(); //so there are no trails
})

//sync the ball data for each of the new browers opened
socket.on('ballSync', function(data) {
  var locationData = JSON.parse(data);
  ball.x = locationData.x;
  ball.y = locationData.y;
  drawCanvas();
});

//retreiving player1 data and uses these values when redrawing canvas
socket.on('player1Sync', function(data) {
  var locationData = JSON.parse(data);
  paddleOne.y = locationData.y;
  drawCanvas();
});

//retreiving player2 data and uses these values when redrawing canvas
socket.on('player2Sync', function(data) {
  var locationData = JSON.parse(data);
  paddleTwo.y = locationData.y;
  drawCanvas();
});

// https://stackoverflow.com/questions/13831601/disabling-and-enabling-a-html-input-button
// how to grey out buttons that are taken (set disable to true/ false)
socket.on('setPlayerButtons', function(data) {
  var buttonStatus = JSON.parse(data);
  document.getElementById("b1").disabled = buttonStatus.b1;
  document.getElementById("b2").disabled = buttonStatus.b2;
});

// grey out buttons that are taken (set disable to true/ false)
socket.on('setButtonLeave', function(data) {
  var buttonStatus = JSON.parse(data);
  document.getElementById("leave").disabled = buttonStatus.leave;
});

//change paddle colours once users are selected
socket.on('changeColour', function(data) {
  var locationData = JSON.parse(data);
  paddleOne.colour = locationData.paddle1;
  paddleTwo.colour = locationData.paddle2;
});

//https://www.w3schools.com/js/js_output.asp (output below canvas)
socket.on('scoreChange', function(data) {
  var locationData = JSON.parse(data);
  document.getElementById("score1").innerHTML = locationData.score1;
  document.getElementById("score2").innerHTML = locationData.score2;
});
