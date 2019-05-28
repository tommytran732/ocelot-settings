function robotLib(config: any) {
  const enum Direction { Left, Right, Center } // PK shootout aim/block.

  let approach: Direction = Direction.Center,
      sslVisionId: number = -1,
      self: any,
      world: any;

  // TODO: MIN_X adjusted from -4300 for lab.
  const MIN_X: number = 100, MAX_X: number = 4300, MIN_Y: number = -2800, MAX_Y: number = 2800,
        PK_BALL: number = 3000,
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

            if (theta > 2 * Math.PI) {
              theta -= ((2 * Math.PI) * Math.trunc(theta / (2 * Math.PI)));
            } else if (theta < -2 * Math.PI) {
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
              throw Error(Math.ceil(dToBall) + ' units is too far from ball; must be w/i 300.');
            } else if (dToBall > 150) {
              return true;
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
            if (cmd._fill) { // For now we can assume this is a kick cmd.
              if (Math.abs(world.vX) > 0.1 || Math.abs(world.vY) > 0.1) {
                mQ.push(Object.assign({}, cmd));
              }
              cmd._fill();
              delete cmd._fill;
            }
            return cmd;
          },
          robot: (id: number = sslVisionId) => {
            const botFound: any = world.ourBots.find(bot => bot.id === id) ||
                                  world.theirBots.find(bot => bot.id === id);

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
          pauseAndSend: function(payload: object, delay: number = 0) {
            return gets.runnerResult().runner.pauseImmediate(() => {
              if (delay) {
                window.setTimeout(this.send, delay, payload);
              } else {
                this.send(payload);
              }
            });
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
        pk: any = { // PK activity.
          aim: (direction: Direction) => {
            checks.id();

            let y: number,
                theta: number;

            switch (direction) {
              case Direction.Left:
                y = 180;
                theta = Math.PI / -9;
                break;
              case Direction.Right:
                y = -180;
                theta = Math.PI / 9;
                break;
              default:
                y = 0;
                theta = 0;
            }

            approach = direction;

            return commsExec.pauseAndSend({ x: PK_BALL - 500, y, theta, sslVisionId });
          },
          block: (direction: Direction) => {
            checks.id();

            const y: number = direction === Direction.Left ? -500 :
                              (direction === Direction.Right ? 500 : 0);

            return commsExec.pauseAndSend({ x: MAX_X, y, theta: Math.PI, sslVisionId });
          },
          blockRandom: function() {
            const rand = Math.random();
            return rand < .333 ? this.block(Direction.Left) :
              (rand < .667 ? this.block(Direction.Center) : this.block(Direction.Right));
          },
          willMiss: (direction: Direction) => {
            const rand = Math.random();

            return ((direction === Direction.Left && approach === Direction.Right) ||
                    (direction === Direction.Right && approach === Direction.Left)) ?
                    rand < .3 : rand < .1;
          },
          shoot: function(kickDirection: Direction = approach) {
            checks.id();

            let y: number,
                theta: number,
                wide: boolean;

            switch (approach) {
              case Direction.Left:
                y = 20;
                theta = Math.PI / -9;
                break;
              case Direction.Right:
                y = -20;
                theta = Math.PI / 9;
                break;
              default:
                y = 0;
                theta = 0;
            }

            mQ.push({ sslVisionId, x: PK_BALL - 150, y, theta });

            if (kickDirection !== approach) {
              wide = this.willMiss(kickDirection);

              switch (kickDirection) {
                case Direction.Left:
                  y = 20;
                  theta = Math.PI / (wide ? -7 : -9);
                  break;
                case Direction.Right:
                  y = -20;
                  theta = Math.PI / (wide ? 7 : 9);
                  break;
                default:
                  y = 0;
                  theta = wide ? Math.PI / (approach === Direction.Left ? -7 : 7) : 0;
              }

              mQ.push({ sslVisionId, x: PK_BALL - 150, y, theta });
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
          move: (x: number, y: number, theta: number, time: number) => {
            checks.id();
            [x, y, theta, time] = checks.args(x, y, theta, time);
            return commsExec.pauseAndSend({ sslVisionId, x, y, theta }, time);
          },
          project: (id: number, time: number) => {
            checks.id() || checks.id(id);
            time = checks.args(0, 0, 0, time)[3];

            const bot = gets.robot(id),
                  pX = bot.pX + (bot.vX * time),
                  pY = bot.pY + (bot.vY * time);

            return { pX, pY };
          }
        },
        soccer: any = { // Soccer activity.
          _fill: function() {
            [this.x, this.y, this.theta] = checks.args(
              world.pX + (120 * Math.cos(self.pTheta - Math.PI)),
              world.pY + (120 * Math.sin(self.pTheta - Math.PI)),
              self.pTheta, 0);
          },
          _align: function(kick) {
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
            return commsExec.pauseAndSend({ sslVisionId,
              x: world.pX + (120 * Math.cos(theta)),
              y: world.pY + (120 * Math.sin(theta)),
              theta: theta - Math.PI
            });
          }
        };

  // Guard to prevent Ocelot-beta crash.
  if (config.ws) {
    config.ws.onmessage = (e: any) => {
      world = JSON.parse(e.data);
      try {
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
    setId: (id: number) => {
      checks.id(id);
      sslVisionId = id;
      commsExec.pauseAndSend({});
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
    delayedMove: (x: number, y: number, theta: number, time: number) => {
      return tag.move(x, y, theta, time);
    },
    move: function(x: number, y: number, theta: number) {
      return this.delayedMove(x, y, theta, 0);
    },
    moveXY: function(x: number, y: number) {
      return this.move(x, y, self.pTheta, 0);
    },
    moveX: function(x: number) {
      return this.moveXY(x, self.pY);
    },
    moveY: function(y: number) {
      return this.moveXY(self.pX, y);
    },
    rotate: function(theta: number) {
      return this.move(self.pX, self.pY, theta, 0);
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
    orient: (theta: number) => {
      return soccer.rotate(theta);
    },
    shoot: () => {
      return soccer.shoot();
    }
  };
}
