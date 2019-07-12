let robot = require('robotLibrary'); // Load the robot programming library
let myId = 0;
let partnerId = 1;
let distThreshold = 700;
let homeX = -1200;
let homeY = -1000;

robot.setId(myId); // Control the first (and only) robot on the field

function ballClose(ballX, ballY) {
  let xDiff = ballX - homeX;
  let yDiff = ballY - homeY;
  let distance = Math.sqrt((xDiff * xDiff) + (yDiff * yDiff));
  if (distance < distThreshold) {
    return true;
  }
  return false;
}

function goToBall(targetAngle) {
  let ballX = robot.getBallPosX()
  let ballY = robot.getBallPosY();
  let targetX = ballX - 250;
  let targetY = ballY;
  robot.moveTo(targetX, targetY, 180 + targetAngle);
  robot.turnAroundBall(targetAngle);
}

while (true) {
  let ballX = robot.getBallPosX();
  let ballY = robot.getBallPosY();
  let ballVX = Math.abs(robot.getBallVelX());
  let ballVY = Math.abs(robot.getBallVelY());
  let velSum = ballVX + ballVY;
  let partnerX = robot.getPosX(partnerId);
  let partnerY = robot.getPosY(partnerId);

  // If the ball is moving
  if (velSum > 0) {
    if (robot.canCatch()) {
      robot.catchBall();
    } else {
      robot.wait(2);
    }
  } else {  // if the ball is static
    if (ballX < 0) { // negative side player
      if (ballClose(ballX, ballY)) { // Ball is close to home
        let targetAngle = robot.angleFrom(partnerX, partnerY, ballX, ballY);
        goToBall(targetAngle);
        robot.turnAroundBall(targetAngle);
        robot.shoot();
      } else { // ball is far from home
        let targetAngle = robot.angleFrom(homeX, homeY, ballX, ballY);
        goToBall(targetAngle);
        robot.turnAroundBall(targetAngle);
        robot.dribble();
    }
    }
  }
}
