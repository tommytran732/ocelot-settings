let robot = require('robotLibrary');

let myId = 0;
let opponentId = 1;

let t = 4;
let maxDist = 3000;

robot.setId(myId);

while (true) {
  let nowX = robot.getPosX(opponentId);
  let nowY = robot.getPosY(opponentId);
  let predX = robot.predictX(opponentId, t);
  let predY = robot.predictY(opponentId, t);
  let bestD = 0;
  let bestX = 0;
  let bestY = 0;
  for (let i = 0; i < 100; ++i) {
    let a = Math.PI * 2.0 * (Math.random() - 0.5);
    let r = maxDist * Math.random();
    let x = robot.getPosX() + r * Math.cos(a);
    let y = robot.getPosY() + r * Math.sin(a);
    x = absBound(x, 1500);
    y = absBound(y, 1000);
    // let d = dist(x, y, predX, predY);
    let d = lineDist(nowX, nowY, predX, predY, x, y);
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

function lineDist(x1, y1, x2, y2, x, y) {
  let d = dist(x1, y1, x2, y2);
  if (d < 1e-3) {
    return dist(x1, y1, x, y);
  }
  let dirX = (x2 -  x1) / d;
  let dirY = (y2 -  y1) / d;
  let perpX = -dirY;
  let perpY = dirX;

  let perpDist = Math.abs((x - x1) * perpX + (y - y1) * perpY);
  let projDist = (x - x1) * dirX + (y - y1) * dirY;

  if (projDist < 0) {
    return dist(x1, y1, x, y);
  } else if (projDist > d) {
    return dist(x2, y2, x, y);
  }
  return perpDist;
}
