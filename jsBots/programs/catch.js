let robot = require('robotLibrary'); // Load the robot programming library
robot.setId(0); // Control the first (and only) robot on the field

while (true) {
  if (robot.canCatch()) {
    robot.catchBall();
  } else {
    robot.wait(0.5);
  }
}
