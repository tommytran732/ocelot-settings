function robotLib(config: any) {
  const enum Direction { Left, Right, Center } // PK shootout aim/block.

  let approach: Direction = Direction.Center,
      sslVisionId: number = -1,
      self: any,
      world: any;

  const mQ: object[] = [], // Message queue for batching messages in a single pause-resume cycle.
        checks: any = { // Check things.
          args: (x: number, y: number, theta: number, time: number, speed: number) => {
            if (typeof x !== 'number' || typeof y !== 'number' || typeof theta !== 'number' ||
                typeof time !== 'number' || typeof speed !== 'number') {
              throw Error('Please pass numbers to the function.');
            }

            // TODO: X min adjusted from -4300 for lab.
            if (x < 100) {
              x = 100;
            } else if (x > 4300) {
              x = 4300;
            }

            if (y < -2800) {
              y = -2800;
            } else if (y > 2800) {
              y = 2800;
            }

            if (speed < 1) {
              speed = 1;
            } else if (speed > 10) {
              speed = 10;
            }

            return [x, y, theta, time < 0 ? 0 : time, speed / 10];
          },
          id: (id: number = sslVisionId) => {
            if (!Number.isInteger(id) || id < 0 || id > 9) {
              throw Error(`Invalid robot number: ${id}.`);
            }
          },
          dist: () => {
            if (Math.sqrt(Math.pow(world.pX - self.pX, 2) +
                Math.pow(world.pY - self.pY, 2)) > 250) {
              throw Error('Too far from ball; must be w/i 250 units.');
            }
          }
        },
        gets: any = { // Get things.
          payload: (cmd: any) => {
            if (cmd._fill) {
              cmd._fill();
              delete cmd._fill;
            }
            return cmd;
          },
          robot: (id: number = sslVisionId) => {
            const botFound: any = world.ourBots.find(bot => bot.id === id);

            if (!botFound) {
              throw Error(`Robot ${id} not found.`);
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

            if (runnerResult.isRunning) {
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

            return commsExec.pauseAndSend({ x: 2500, y, theta, sslVisionId });
          },
          block: (direction: Direction) => {
            checks.id();

            const y: number = direction === Direction.Left ? -500 :
                              (direction === Direction.Right ? 500 : 0);

            return commsExec.pauseAndSend({ x: 4300, y, theta: Math.PI, sslVisionId });
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

            mQ.push({ x: 2850, y, theta, sslVisionId });

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

              mQ.push({ x: 2850, y, theta, sslVisionId });
            }

            mQ.push({ kick: 1, sslVisionId });

            return commsExec.pauseAndSend(mQ.shift());
          }
        },
        tag: any = { // Tag activity.
          distance: (x: number, y: number) => {
            checks.id();
            [x, y] = checks.args(x, y, 0, 0, 0);
            return Math.sqrt(Math.pow(x - self.pX, 2) + Math.pow(y - self.pY, 2));
          },
          move: (x: number, y: number, theta: number, time: number) => {
            checks.id();
            [x, y, theta, time] = checks.args(x, y, theta, time, 0);
            return commsExec.pauseAndSend({ x, y, theta, sslVisionId }, time);
          },
          project: (id: number, time: number) => {
            checks.id() && checks.id(id);
            time = checks.args(0, 0, 0, time, 0)[3];

            const bot = gets.robot(id),
                  pX = bot.pX + (bot.vX * time),
                  pY = bot.pY + (bot.vY * time);

            return { pX, pY };
          }
        },
        soccer: any = { // Soccer activity.
          shoot: (kick: number = 10) => {
            checks.id() && checks.dist();
            kick = checks.args(0, 0, 0, 0, kick)[4];
            return commsExec.pauseAndSend({ kick, sslVisionId });
          },
          kick: function(speed: number = 1) {
            mQ.push({ sslVisionId, _fill: function() {
              this.x = world.pX + (120 * Math.cos(self.pTheta - Math.PI));
              this.y = world.pY + (120 * Math.sin(self.pTheta - Math.PI));
              this.theta = self.pTheta;
            }});
            return this.shoot(speed);
          },
          rotate: (theta: number) => {
            checks.id() && checks.dist();
            theta = checks.args(0, 0, theta, 0, 0)[2];
            return commsExec.pauseAndSend({ sslVisionId,
              x: world.pX + (120 * Math.cos(theta)),
              y: world.pY + (120 * Math.sin(theta)),
              theta: theta - Math.PI
            });
          }
        };

  // TODO: Guard to prevent Ocelot-beta crash while it doesn't support WS.
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
    getWorld: () => {
      return commsExec.pauseAndSend({});
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
    kick: (speed: number) => {
      return soccer.kick(speed);
    },
    orient: (theta: number) => {
      return soccer.rotate(theta);
    },
    shoot: (speed: number) => {
      return soccer.shoot(speed);
    }
  };
}
