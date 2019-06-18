function robotLibrary(config: any) {
  const enum Direction { Left, Right, Center }

  let approach: Direction = Direction.Center,
      sslVisionId: number = -1,
      dssBall: boolean,
      self: any,
      world: any;

  const MIN_X: number = -1800, MAX_X: number = 1800, MIN_Y: number = -1200, MAX_Y: number = 1200,
        MIN_POST: number = -400, MAX_POST: number = 400,
        mQ: object[] = [], // Message queue for batching messages in a single pause-resume cycle.
        checks: any = { // Check things.
          angle: () => {
            // TODO: Check to make sure we are facing the ball.
          },
          args: (x: number, y: number, theta: number, time: number) => {
            if (typeof x !== 'number' || typeof y !== 'number' || typeof theta !== 'number' ||
                typeof time !== 'number') {
              throw Error('Please pass numbers to the function.');
            }

            if (x === -0) { x = 0; }
            if (y === -0) { y = 0; }
            if (theta === -0) { theta = 0; }
            if (time === -0) { time = 0; }

            if (x < MIN_X) {
              x = MIN_X;
            } else if (x > MAX_X) {
              x = MAX_X;
            }

            if (y < MIN_Y) {
              y = MIN_Y;
            } else if (y > MAX_Y) {
              y = MAX_Y;
            }

            if (theta >= 2 * Math.PI) {
              theta -= ((2 * Math.PI) * Math.trunc(theta / (2 * Math.PI)));
            } else if (theta <= -2 * Math.PI) {
              theta += ((2 * Math.PI) * Math.trunc(theta / (-2 * Math.PI)));
            }

            return [x, y, theta, time < 0 ? 0 : time];
          },
          id: (id: number = sslVisionId) => {
            if (!Number.isInteger(id) || id < 0 || id > 9) {
              throw Error('Invalid robot number: ' + id);
            }
          },
          dist: () => {
            const dToBall: number = Math.sqrt(Math.pow(world.pX - self.pX, 2) +
                Math.pow(world.pY - self.pY, 2));

            if (dToBall > 300) {
              throw Error(Math.ceil(dToBall) + ' units is too far from ball; must be within 300.');
            } else if (dToBall > 150) {
              return true;
            }
          },
          msg: (msg: any) => {
            if (!Object.keys(msg).length) {
              throw Error('No data found; make sure your simulator is running.');
            } else {
              return msg;
            }
          }
        },
        gets: any = { // Get things.
          ball: () => {
            return {
              pX: world.pX,
              pY: world.pY,
              vX: world.vX,
              vY: world.vY
            };
          },
          payload: (cmd: any) => {
            if (cmd._fill) { // For now we can assume this is a kick command.
              if (Math.abs(world.vX) > 0.1 || Math.abs(world.vY) > 0.1) {
                mQ.push(Object.assign({}, cmd));
              }
              cmd._fill();
              delete cmd._fill;
            }

            return cmd;
          },
          robot: (id: number = sslVisionId) => {
            const botFound: any = (world.ourBots && world.ourBots.find(bot => bot.id === id)) ||
                                  (world.theirBots && world.theirBots.find(bot => bot.id === id));

            if (!botFound) {
              throw Error('Robot not found: ' + id);
            } else {
              return botFound;
            }
          },
          runnerResult: () => {
            const runnerResult: any = config.getRunner();

            if (runnerResult.kind === 'error') {
              throw Error('The program is not running.');
            } else {
              return runnerResult.value;
            }
          }
        },
        commsExec: any = { // Communications & Execution.
          send: (payload: object) => {
            config.ws.send(JSON.stringify(payload));
          },
          pauseAndSend: function(payload: object) {
            return gets.runnerResult().runner.pauseImmediate(() => this.send(payload));
          },
          resume: (value: any = world, isError: boolean = false) => {
            const runnerResult: any = gets.runnerResult();

            if (runnerResult.isRunning && runnerResult.runner.k) {
              runnerResult.runner.continueImmediate({
                type: isError ? 'exception' : 'normal',
                stack: [], value
              });
            } else {
              runnerResult.onStopped();
            }
          }
        },
        maze: any = { // Maze activity.
          _snapAngle: () => {
            let theta: number = checks.args(0, 0, self.pTheta, 0)[2];

            if (theta < 0) {
              if (theta > Math.PI / -4) {
                theta = 0;
              } else if (theta > 3 * Math.PI / -4) {
                theta = Math.PI / -2;
              } else if (theta > 5 * Math.PI / -4) {
                theta = -Math.PI;
              } else if (theta >  7 * Math.PI / -4) {
                theta = 3 * Math.PI / -2;
              } else {
                theta = 0;
              }
            } else {
              if (theta < Math.PI / 4) {
                theta = 0;
              } else if (theta <  3 * Math.PI / 4) {
                theta = Math.PI / 2;
              } else if (theta <  5 * Math.PI / 4) {
                theta = Math.PI;
              } else if (theta <  7 * Math.PI / 4) {
                theta = 3 * Math.PI / 2;
              } else {
                theta = 0;
              }
            }

            return theta;
          },
          _snapPosition: () => {
            let x: number = self.pX,
                y: number = self.pY;

            x = 400 * ((x < 0) ? Math.floor(Math.ceil(x / 200) / 2) :
                                 Math.ceil(Math.floor(x / 200) / 2));

            y = (y < 0) ? ((400 * Math.ceil(y / 400)) - 200) :
                          ((400 * Math.floor(y / 400)) + 200);

            return [x, y];
          },
          moveForward: function() {
            checks.id();

            const theta: number = checks.args(0, 0, self.pTheta, 0)[2];

            let [x, y]: [number, number] = this._snapPosition();

            if (theta < 0) {
              if (theta > Math.PI / -4) {
                x += 400;
              } else if (theta > 3 * Math.PI / -4) {
                y -= 400;
              } else if (theta > 5 * Math.PI / -4) {
                x -= 400;
              } else {
                y += 400;
              }
            } else {
              if (theta < Math.PI / 4) {
                x += 400;
              } else if (theta <  3 * Math.PI / 4) {
                y += 400;
              } else if (theta <  5 * Math.PI / 4) {
                x -= 400;
              } else {
                y -= 400;
              }
            }

            [x, y] = checks.args(x, y, 0, 0);

            return commsExec.pauseAndSend({ sslVisionId, x, y, theta });
          },
          turn: function(direction: Direction) {
            checks.id();

            return commsExec.pauseAndSend({ sslVisionId,
              x: self.pX,
              y: self.pY,
              theta: checks.args(0, 0, this._snapAngle() + (Math.PI /
                (direction === Direction.Left ? 2 : -2)), 0)[2]
            });
          }
        },
        pk: any = { // PK activity.
          aim: (direction: Direction) => {
            checks.id();

            let y: number,
                theta: number;

            switch (direction) {
              case Direction.Left:
                y = 150;
                theta = Math.PI / -12;
                break;
              case Direction.Right:
                y = -150;
                theta = Math.PI / 12;
                break;
              default:
                y = 0;
                theta = 0;
            }

            approach = direction;

            return commsExec.pauseAndSend({ sslVisionId, y, theta,
              dssBall: true, x: world.pX - 500 });
          },
          block: (direction: Direction) => {
            checks.id();

            return commsExec.pauseAndSend({ sslVisionId,
              x: MAX_X,
              y: direction === Direction.Left ? (MIN_POST + 50) :
                (direction === Direction.Right ? (MAX_POST - 50) : 0),
              theta: Math.PI
            });
          },
          blockRandom: function() {
            const rand: number = Math.random();

            return rand < .333 ? this.block(Direction.Left) :
              (rand < .667 ? this.block(Direction.Center) : this.block(Direction.Right));
          },
          willMiss: (direction: Direction) => {
            const rand: number = Math.random();

            return ((direction === Direction.Left && approach === Direction.Right) ||
                    (direction === Direction.Right && approach === Direction.Left)) ?
                    rand < .3 : rand < .1;
          },
          shoot: function(kickDirection: Direction = approach) {
            checks.id();

            let wide: boolean,
                theta: number = approach === Direction.Left ? Math.PI / -12 :
                  (approach === Direction.Right ? Math.PI / 12 : 0);

            mQ.push({ sslVisionId, theta, dssBall: true,
              x: world.pX + (120 * Math.cos(theta - Math.PI)),
              y: world.pY + (120 * Math.sin(theta - Math.PI)),
            });

            if (kickDirection !== approach) {
              wide = this.willMiss(kickDirection);

              switch (kickDirection) {
                case Direction.Left:
                  theta = Math.PI / (wide ? -10 : -12);
                  break;
                case Direction.Right:
                  theta = Math.PI / (wide ? 10 : 12);
                  break;
                default:
                  theta = wide ? Math.PI / (approach === Direction.Left ? -10 : 10) : 0;
              }

              mQ.push({ sslVisionId, theta, dssBall: true,
                x: world.pX + (120 * Math.cos(theta - Math.PI)),
                y: world.pY + (120 * Math.sin(theta - Math.PI)),
              });
            }

            mQ.push({ sslVisionId, kick: 1 });

            return commsExec.pauseAndSend(gets.payload(mQ.shift()));
          }
        },
        tag: any = { // Tag activity.
          distance: (x: number, y: number) => {
            checks.id();
            [x, y] = checks.args(x, y, 0, 0);

            return Math.sqrt(Math.pow(x - self.pX, 2) + Math.pow(y - self.pY, 2));
          },
          move: (x: number, y: number, theta: number) => {
            checks.id();
            [x, y, theta] = checks.args(x, y, theta, 0);

            return commsExec.pauseAndSend({ sslVisionId, dssBall, x, y, theta });
          },
          project: (id: number, time: number) => {
            checks.id() || checks.id(id);
            time = checks.args(0, 0, 0, time)[3];

            const bot: any = gets.robot(id),
                  pX: number = bot.pX + (bot.vX * time),
                  pY: number = bot.pY + (bot.vY * time);

            return { pX, pY };
          }
        },
        soccer: any = { // Soccer activity.
          _fill: function() {
            this.dssBall = true;
            [this.x, this.y, this.theta] = checks.args(
              world.pX + (120 * Math.cos(self.pTheta - Math.PI)),
              world.pY + (120 * Math.sin(self.pTheta - Math.PI)),
              self.pTheta, 0);
          },
          _align: function(kick: number) {
            if (checks.id() || checks.dist()) {
              mQ.push({ sslVisionId, _fill: this._fill });
            }
            mQ.push({ sslVisionId, kick });
          },
          shoot: function(kick: number = 1) {
            this._align(kick);

            return commsExec.pauseAndSend(gets.payload(mQ.shift()));
          },
          dribble: function(kick: number = 0) {
            this._align(kick);
            mQ.push({ sslVisionId, _fill: this._fill });

            return commsExec.pauseAndSend(gets.payload(mQ.shift()));
          },
          rotate: (theta: number) => {
            checks.id() || checks.dist();
            theta = checks.args(0, 0, theta, 0)[2];

            return commsExec.pauseAndSend({ sslVisionId, dssBall: true,
              x: world.pX + (120 * Math.cos(theta)),
              y: world.pY + (120 * Math.sin(theta)),
              theta: checks.args(0, 0, theta - Math.PI, 0)[2]
            });
          },
          trackPosition: (id: number) => {
            checks.id() || checks.id(id);

            const botY: number = gets.robot(id).pY;

            return commsExec.pauseAndSend({ sslVisionId,
              x: self.pX,
              y: botY < MIN_POST ? (MIN_POST + 50) : (botY > MAX_POST ? (MAX_POST - 50) : botY),
              theta: self.pTheta
            });
          },
          trackRotation: (id: number) => {
            checks.id() || checks.id(id);

            const bot: any = gets.robot(id),
                  botTheta: number = checks.args(0, 0, bot.pTheta, 0)[2],
                  target: number = (bot.pX > 0 && self.pX > 0) ?
                    bot.pY + ((1800 - bot.pX) * Math.tan(botTheta)) :
                    ((bot.pX < 0 && self.pX < 0) ?
                    bot.pY - ((bot.pX + 1800) * Math.tan(botTheta)) : Number.NaN);

            if (Number.isFinite(target)) {
              return commsExec.pauseAndSend({ sslVisionId,
                x: self.pX,
                y: target < MIN_POST ? (MIN_POST + 50) :
                  (target > MAX_POST ? (MAX_POST - 50) : target),
                theta: self.pTheta
              });
            }
          }
        };

  // Guard to prevent Ocelot-beta crash.
  if (config.ws) {
    config.ws.onmessage = (e: any) => {
      try {
        world = checks.msg(JSON.parse(e.data));
        self = sslVisionId < 0 ? self : gets.robot();
        if (mQ.length) {
          commsExec.send(gets.payload(mQ.shift()));
        } else {
          commsExec.resume();
        }
      } catch (e) {
        commsExec.resume(e, true);
      }
    };
  }

  return { // Methods exposed in client library.
    setId: (id: number, dss: boolean = true) => {
      checks.id(id);
      dssBall = Boolean(dss);
      sslVisionId = id;

      return commsExec.pauseAndSend({});
    },
    queryWorld: () => {
      return commsExec.pauseAndSend({});
    },
    filterBall: () => {
      return world ? gets.ball() : {};
    },
    filterBot: (id: number = sslVisionId) => {
      return (world && !checks.id(id)) ? gets.robot(id) : {};
    },
    moveForward: () => {
      return maze.moveForward();
    },
    turnLeft: () => {
      return maze.turn(Direction.Left);
    },
    turnRight: () => {
      return maze.turn(Direction.Right);
    },
    aimLeft: () => {
      return pk.aim(Direction.Left);
    },
    aimRight: () => {
      return pk.aim(Direction.Right);
    },
    aimCenter: () => {
      return pk.aim(Direction.Center);
    },
    strike: () => {
      return pk.shoot();
    },
    strikeLeft: () => {
      return pk.shoot(Direction.Left);
    },
    strikeRight: () => {
      return pk.shoot(Direction.Right);
    },
    strikeCenter: () => {
      return pk.shoot(Direction.Center);
    },
    blockLeft: () => {
      return pk.block(Direction.Left);
    },
    blockRight: () => {
      return pk.block(Direction.Right);
    },
    blockCenter: () => {
      return pk.block(Direction.Center);
    },
    blockRandom: () => {
      return pk.blockRandom();
    },
    move: function(x: number, y: number, theta: number) {
      return tag.move(x, y, theta);
    },
    moveXY: function(x: number, y: number) {
      return this.move(x, y, self.pTheta);
    },
    moveX: function(x: number) {
      return this.moveXY(x, self.pY);
    },
    moveY: function(y: number) {
      return this.moveXY(self.pX, y);
    },
    rotate: function(theta: number) {
      return this.move(self.pX, self.pY, theta);
    },
    distanceFrom: (x: number, y: number) => {
      return tag.distance(x, y);
    },
    projectMove: (id: number, time: number) => {
      return tag.project(id, time);
    },
    dribble: () => {
      return soccer.dribble();
    },
    rotateAroundBall: (theta: number) => {
      return soccer.rotate(theta);
    },
    shoot: () => {
      return soccer.shoot();
    },
    trackPosition: (id: number) => {
      return soccer.trackPosition(id);
    },
    trackRotation: (id: number) => {
      return soccer.trackRotation(id);
    }
  };
}
