let robot = require('robotLibrary'); // Load the robot programming library
let myId = 1;
let partnerId = 0;
let homeX = 1200;
let homeY = -1000;
let angleThreshold = 45.0;
let openThreshold = 8.0;
let goalieId = 3;
let defId = 6;

robot.setId(myId); // set robot to control

function distance(pX1, pY1, pX2, pY2) {
  let xdiff = pX1 - pX2;
  let ydiff = pY1 - pY2;
  return Math.sqrt((xdiff * xdiff) + (ydiff * ydiff));
}

function ballTowardsMe(ballX, ballY) {
  let ballVelX = robot.getBallVelX();
  let ballVelY = robot.getBallVelY();
  if (Math.abs(ballVelX + ballVelY) < 1) {
    return false;
  }
  let ballDirX = ballX + ballVelX;
  let ballDirY = ballY + ballVelY;
  let ballAngle = robot.angleFrom(ballX, ballY, ballDirX, ballDirY);
  let angleToMe = robot.angleFrom(ballX, ballY, robot.getPosX(), robot.getPosY());

  return Math.abs(ballAngle - angleToMe) < angleThreshold
}

function myBall(ballX, ballY, partnerX, partnerY) {
  let myDist = robot.distanceTo(ballX, ballY);
  let partnerDist = distance(partnerX, partnerY, ballX, ballY);
  return myDist < partnerDist || ballTowardsMe(ballX, ballY);
}

function goToBall(targetAngle) {
  let ballX = robot.getBallPosX()
  let ballY = robot.getBallPosY();
  let targetX = ballX - 250;
  let targetY = ballY;
  robot.moveTo(targetX, targetY, targetAngle);
}

function openAngle(targetAngle, ballX, ballY) {
  let goalieX = robot.getPosX(goalieId);
  let goalieY = robot.getPosY(goalieId);
  let defX = robot.getPosX(defId);
  let defY = robot.getPosY(defId);
  let goalieAngle = robot.angleFrom(goalieX, goalieY, ballX, ballY);
  let defAngle = robot.angleFrom(defX, defY, ballX, ballY);
  let goalieDiff = Math.abs(goalieAngle - targetAngle);
  let defDiff = Math.abs(defAngle - targetAngle);
  return !(goalieDiff < openThreshold || defDiff < openThreshold);
}
while (true) {
  let ballX = robot.getBallPosX();
  let ballY = robot.getBallPosY();
  let ballVX = robot.getBallVelX();
  let ballVY = robot.getBallVelY();
  let velSum = Math.abs(ballVX + ballVY);
  let partnerX = robot.getPosX(partnerId);
  let partnerY = robot.getPosY(partnerId);

  if (myBall(ballX, ballY, partnerX, partnerY)) {  // robot should handle the ball
    if (velSum > 1) {  // If the ball is moving
      if (robot.canCatch() && ballTowardsMe(ballX, ballY)) {
        robot.catchBall();
      }
    } else {  // if the ball is static
      // Angle to goal target
      let goalX = 1700;
      let goalY = -250;
      let targetAngle = robot.angleFrom(goalX, goalY, ballX, ballY);
      if (openAngle(targetAngle, ballX, ballY)) {
        goToBall(targetAngle + 180);
        robot.turnAroundBall(targetAngle);
        robot.shoot();
        robot.wait(1);
      } else {
        if (Math.abs(robot.getVelX(partnerId)) > 1 ||
            Math.abs(robot.getVelY(partnerId))> 1) {
          robot.wait(1);
        } else {
          let partnerAngle = robot.angleFrom(partnerX, partnerY, ballX, ballY);
          goToBall(partnerAngle + 180);
          robot.turnAroundBall(partnerAngle);
          robot.shoot();
          robot.wait(1);
        }
      }
    }
  } else { // robot should set up to receive pass.
      let faceAngle = robot.angleFrom(partnerX, partnerY, homeX, homeY);
      robot.moveTo(homeX, homeY, faceAngle + 180);
  }
}
