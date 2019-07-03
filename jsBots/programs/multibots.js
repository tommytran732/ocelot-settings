let robot = require('robotLibrary');

while (true) {
  for (let i = 0; i < 3; ++i) {
    let x = 3000 * (Math.random() - 0.5);
    let y = 2000 * (Math.random() - 0.5);
    robot.setId(i);
    robot.moveToXY(x, y);
  }
}