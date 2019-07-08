let robot = require('robotLibrary');
let myId = 1;
robot.setId(myId);
function goto(x, y) {
  let myX = robot.getMyXCell();
  let myY = robot.getMyYCell();
  robot.moveByXCells(x  - myX);
  robot.moveByYCells(y  - myY);
}

goto(0, -2);
while (true) {
  goto(0,2);
  goto(0,-2);
}
