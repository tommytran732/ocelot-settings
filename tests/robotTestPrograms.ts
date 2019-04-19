// Get the world state.
const r = require('robotLib');
console.log(r.getWorld());

// Move to a point.
const r = require('robotLib');
r.setId(0);
r.move(3000, -500, Math.PI);

// Move to successive points.
const r = require('robotLib');
r.setId(0);
r.move(3000, -500, Math.PI);
r.move(0, 0, 0);
r.move(-1000, 500, -Math.PI);

// Move to the same point.
const r = require('robotLib');
r.setId(0);
r.move(0, 0, 0);
r.move(0, 0, 0);

// Rotate to Math.PI then to 0 (360).
const r = require('robotLib');
r.setId(0);
r.rotate(Math.PI);
r.rotate(0);

// Move with set angle.
const r = require('robotLib');
r.setId(0);
r.moveXY(1000, 1000);
r.moveX(0);
r.moveY(0);

// Finite Loop.
const r = require('robotLib');
r.setId(0);
for(let i = 0; i < 3; i += 1) {
  r.moveXY(100, 100);
  r.moveXY(-100, 100);
  r.moveXY(-100, -100);
  r.moveXY(100, -100);
}

// Striker I.
const r = require('robotLib');
r.setId(0);
r.aimLeft();
r.aimRight();
r.aimCenter();
r.aimRight();
r.aimLeft();
r.shoot();

// Striker II.
const r = require('robotLib');
r.setId(0);
r.aimCenter();
r.aimLeft();
r.aimRight();
r.shootCenter(); // Chance of miss.

// Striker III
const r = require('robotLib');
r.setId(0);
r.aimLeft();
r.shootRight(); // Greater chance of miss.

// Goalie I
const r = require('robotLib');
r.setId(1);
const world = r.getWorld();
let them = world.ourBots[0];

while(true) {
  if (them.pX < 2800) {
    them = r.blockRandom().ourBots[0];
  }
}

// Goalie II
const r = require('robotLib');
r.setId(1);
const world = r.getWorld();
let them = world.ourBots[0];

while(true) {
  if (them.pY > 20 && them.pX < 2800) {
    them = r.blockLeft().ourBots[0];
  } else if (them.pY < -20 && them.pX < 2800) {
    them = r.blockRight().ourBots[0];
  } else if (them.pX < 2800) {
    them = r.blockCenter().ourBots[0];
  }
}

// Goalie III
const r = require('robotLib');
r.setId(1);
const world = r.getWorld();
let them = world.ourBots[0];

while(true) {
  if (them.pTheta < -.2) {
    them = r.blockLeft().ourBots[0];
  } else if (them.pTheta > .2) {
    them = r.blockRight().ourBots[0];
  } else {
    them = r.blockCenter().ourBots[0];
  }
}

// It I
const r = require('robotLib');
r.setId(0);
while(true) {
  r.moveXY(-4000, 2000);
  r.moveXY(-4000, -2000);
  r.moveXY(4000, -2000);
  r.moveXY(4000, 2000);
}

// Tag IA
const r = require('robotLib');
r.setId(1);
r.moveXY(100, 100);
let move = null;

while(true) {
  r.getWorld();
  move = r.projectMove(0, 2); // r.projectMove(0,0);
  r.moveXY(move.pX, move.pY);
}

// Tag IB
const r = require('robotLib');
r.setId(2);
r.moveXY(-100, -100);
let move = null, d = null;

while(true) {
  r.getWorld();
  move = r.projectMove(0, 3);
  d = r.distanceFrom(move.pX, move.pY);
  if (d < 2000) {
    r.moveXY(move.pX, move.pY);
  } else if (d < 4000) { // else {
    r.moveXY(move.pX / 2,move.pY / 2);
  }
}
