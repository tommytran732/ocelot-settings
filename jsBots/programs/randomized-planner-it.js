let robot = require('robotLibrary');

let myId = 0;
let opponentId = 1;
let t = 1;

robot.setId(myId);

while (true) {
  let predX = robot.projectX(opponentId, t);
  let predY = robot.projectY(opponentId, t);
  let bestD = 0;
  let bestX = 0;
  let bestY = 0;
  for (let i = 0; i < 50; ++i) {
    let a = Math.PI * 2.0 * (Math.random() - 0.5);
    let r = 2500 * Math.random();
    let x = robot.getPosX() + r * Math.cos(a);
    let y = robot.getPosY() + r * Math.sin(a);
    x = absBound(x, 1500);
    y = absBound(y, 1000);
    let d = dist(x, y, predX, predY);
    if (d > bestD) {
      bestD = d;
      bestX = x;
      bestY = y;
    }
  }
  robot.moveToXY(bestX, bestY);
}

function absBound(x, b) {
  if (x < -b) { return -b; }
  if (x > b) { return b; }
  return x;
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}
