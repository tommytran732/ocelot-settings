let robot = require('robotLibrary');

const myId = 0;
const opponentId = 1;
const t = 1;

robot.setId(myId);

while (true) {
  let a = Math.PI * 2.0 * (Math.random() - 0.5);
  let r = 1000 + 500 * Math.random();
  let x = r * Math.cos(a);
  let y = r * Math.sin(a);
  robot.moveByXY(x, y);
}
