let robot = require('robotLibrary');
robot.setId(1);

while(true) {
  robot.moveToXY(1600, 1000);
  robot.turnTo(180);
  robot.moveToXY(-1600, 1000);
  robot.turnTo(270);
  robot.moveToXY(-1600, -1000);
  robot.turnTo(0);
  robot.moveToXY(1600, -1000);
  robot.turnTo(90);
}
