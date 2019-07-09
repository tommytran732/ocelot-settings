function robotLibrary(config: any) {
  const enum Direction { Left, Right, Center }

  let dssBall: boolean,
      self: any,
      world: any,
      approach: Direction = Direction.Center,
      lastUpdate: number = 0,
      returnFilter: any[] = [],
      sslVisionId: number = -1;

  // Field is 2400 x 3600, though carpet is a bit short in X direction.
  const MIN_X: number = -1700, MAX_X: number = 1700, MIN_Y: number = -1200, MAX_Y: number = 1200,
        MIN_POST: number = -400, MAX_POST: number = 400,
        mQ: object[] = [], // Message queue for batching messages in a single pause-resume cycle.
        angles: any = {
          toDegrees: (angle: number) => angle * (180 / Math.PI),
          toRadians: (angle: number) => angle * (Math.PI / 180)
        },
        checks: any = { // Check things.
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
          catchBall: () => {
            // Math.abs(world.vX) > 0.1 || Math.abs(world.vY) > 0.1
            if (Math.sqrt(Math.pow(world.vX, 2) + Math.pow(world.vY, 2)) < 100) {
              throw Error('Ball is moving to slow.');
            } else if (Math.sqrt(Math.pow(world.pX - self.pX, 2) +
                Math.pow(world.pY - self.pY, 2)) < (21 / 100)) {
              throw Error('Robot is too close to ball.');
            }
          },
          bounds: () => {
            if (world.pX < MIN_X - 110 || world.pX > MAX_X + 110 ||
                world.pY < MIN_Y - 110 || world.pY > MAX_Y + 110 ) {
              throw Error('Ball out of bounds.');
            }
          },
          direction: function() {
            const theta: number = this.args(0, 0, self.pTheta, 0)[2],
                  start: number = theta - (Math.PI / 4),
                  final: number = theta + (Math.PI / 4),
                  angle: number = Math.atan2(world.pY - self.pY, world.pX - self.pX);

            if ((angle < Math.min(start, final) || angle > Math.max(start, final)) &&
                (Math.abs(angle) < 3 || // Hack to account for error.
                (-angle < Math.min(start, final) || -angle > Math.max(start, final)))) {
              throw Error('Robot must be facing the ball.');
            }
          },
          dist: () => {
            const dToBall: number = Math.sqrt(Math.pow(world.pX - self.pX, 2) +
                Math.pow(world.pY - self.pY, 2));

            if (dToBall > 300) {
              throw Error(Math.ceil(dToBall) + 'mm is too far from ball; must be within 300.');
            } else {
              return dToBall > 150;
            }
          },
          id: (id: number = sslVisionId) => {
            if (!Number.isInteger(id) || id < 0 || id > 9) {
              throw Error('Invalid robot number: ' + id);
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
          bot: (id: number = sslVisionId) => {
            const botFound: any = (world.ourBots && world.ourBots.find(bot => bot.id === id)) ||
                                  (world.theirBots && world.theirBots.find(bot => bot.id === id));

            if (!botFound) {
              throw Error('Robot not found: ' + id);
            } else {
              return botFound;
            }
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
          returnVal: function() {
            if (returnFilter.length) {
              let val: number | boolean;

              if (returnFilter[0] === true) {
                checks.id(returnFilter[1]);
                val = (returnFilter[2] === 'pTheta' || returnFilter[2] === 'vTheta') ?
                  angles.toDegrees(this.bot(returnFilter[1])[returnFilter[2]]) :
                  this.bot(returnFilter[1])[returnFilter[2]];
              } else if (returnFilter[0] === false) {
                val = world[returnFilter[2]];
              } else {
                val = returnFilter[0]();
              }

              return val;
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
          pauseAndPrompt: function(msg: string) {
            return gets.runnerResult().runner.pauseImmediate(() =>
              this.resume(window.prompt(msg) || ''));
          },
          pauseAndSend: function(payload: object) {
            return gets.runnerResult().runner.pauseImmediate(() => this.send(payload));
          },
          pauseWaitAndSend: function(time: number) {
            time = checks.args(0, 0, 0, time)[3];

            return gets.runnerResult().runner.pauseImmediate(() => window.setTimeout(() =>
              this.send({}), time * 1000));
          },
          resume: (value: any, isError: boolean = false) => {
            const runnerResult: any = gets.runnerResult();

            if (runnerResult.isRunning && runnerResult.runner.k) {
              const resumeContent: any = { stack: [] };
              if (isError) {
                resumeContent.type = 'exception';
                resumeContent.value = value;
              } else {
                resumeContent.type = 'normal';
                resumeContent.value = typeof value === 'object' ? gets.returnVal() : value;
              }
              returnFilter = [];
              runnerResult.runner.continueImmediate(resumeContent);
            } else {
              runnerResult.onStopped();
            }
          },
          send: (payload: object) => config.ws.send(JSON.stringify(payload)),
          setFilterAndGet: function(filter: any[]) {
            returnFilter = filter;
            return (Date.now() > lastUpdate + 100) ? this.pauseAndSend({}) : gets.returnVal();
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

            x = 500 * ((x < 0) ? Math.floor(Math.ceil(x / 250) / 2) :
                                 Math.ceil(Math.floor(x / 250) / 2));

            y = 500 * ((y < 0) ? Math.floor(Math.ceil(y / 250) / 2) :
                                 Math.ceil(Math.floor(y / 250) / 2));

            return [x, y];
          },
          getBotXCell: (id: number = sslVisionId) => {
            checks.id() || checks.id(id);
            return commsExec.setFilterAndGet([() => {
              const bot: any = gets.bot(id);

              return Math.floor((bot.pX + 250) / 500);
            }]);
          },
          getBotYCell: (id: number = sslVisionId) => {
            checks.id() || checks.id(id);
            return commsExec.setFilterAndGet([() => {
              const bot: any = gets.bot(id);

              return Math.floor((bot.pY + 250) / 500);
            }]);
          },
          botNearby: (id: number) => {
            checks.id() || checks.id(id);

            return commsExec.setFilterAndGet([() => {
              const bot: any = gets.bot(id);

              return tag.distance(bot.pX, bot.pY) < 800;
            }]);
          },
          collides: (obsX: number, obsY: number, x1: number, y1: number,
                     x2OrY2: number, isX: boolean) => {
            return isX ? ((x1 - obsX) * (x2OrY2 - obsX) <= 0 && y1 === obsY) :
              ((y1 - obsY) * (x2OrY2 - obsY) <= 0 && x1 === obsX);
          },
          moveByXCells: function(n: number) {
            checks.id();
            const theta: number = checks.args(0, 0, self.pTheta, 0)[2];
            let [x, y]: [number, number] = this._snapPosition();
            x = x + (500 * n);
            [x, y] = checks.args(x, y, 0, 0);

            return commsExec.pauseAndSend({ sslVisionId, x, y, theta });
          },
          moveByYCells: function(n: number) {
            checks.id();
            const theta: number = checks.args(0, 0, self.pTheta, 0)[2];
            let [x, y]: [number, number] = this._snapPosition();
            y = y + (500 * n);
            [x, y] = checks.args(x , y, 0, 0);

            return commsExec.pauseAndSend({ sslVisionId, x, y, theta });
          },
          moveForward: function() {
            checks.id();

            const theta: number = checks.args(0, 0, self.pTheta, 0)[2];

            let [x, y]: [number, number] = this._snapPosition();

            if (theta < 0) {
              if (theta > Math.PI / -4) {
                x += 500;
              } else if (theta > 3 * Math.PI / -4) {
                y -= 500;
              } else if (theta > 5 * Math.PI / -4) {
                x -= 500;
              } else {
                y += 500;
              }
            } else {
              if (theta < Math.PI / 4) {
                x += 500;
              } else if (theta <  3 * Math.PI / 4) {
                y += 500;
              } else if (theta <  5 * Math.PI / 4) {
                x -= 500;
              } else {
                y -= 500;
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
          _willMiss: (direction: Direction) => {
            const rand: number = Math.random();

            return ((direction === Direction.Left && approach === Direction.Right) ||
                    (direction === Direction.Right && approach === Direction.Left)) ?
                    rand < .3 : rand < .1;
          },
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
              wide = this._willMiss(kickDirection);

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

            return commsExec.setFilterAndGet([() =>
              Math.sqrt(Math.pow(x - self.pX, 2) + Math.pow(y - self.pY, 2))]);
          },
          move: (x: number, y: number, theta: number, isRelative: boolean = false) => {
            checks.id() || checks.args(x, y, theta, 0);
            [x, y, theta] = isRelative ?
              checks.args(self.pX + x, self.pY + y, self.pTheta + theta, 0) :
              checks.args(x, y, theta, 0);

            return commsExec.pauseAndSend({ sslVisionId, dssBall, x, y, theta });
          },
          project: (id: number, time: number, isX: boolean = false) => {
            checks.id() || checks.id(id);
            time = checks.args(0, 0, 0, time)[3];

            return commsExec.setFilterAndGet([() => {
              const bot: any = gets.bot(id);

              return isX ? (bot.pX + (bot.vX * time)) : (bot.pY + (bot.vY * time));
            }]);
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
            checks.id();
            checks.bounds();
            checks.dist();
            checks.direction();
            checks.dist() && mQ.push({ sslVisionId, _fill: this._fill });
            mQ.push({ sslVisionId, kick });
          },
          catch: () => {
            checks.id() || checks.catchBall();

            return commsExec.pauseAndSend({ sslVisionId, catchBall: true });
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
          shoot: function(kick: number = 1) {
            this._align(kick);

            return commsExec.pauseAndSend(gets.payload(mQ.shift()));
          },
          trackPosition: (id: number) => {
            checks.id() || checks.id(id);

            const botY: number = gets.bot(id).pY;

            return commsExec.pauseAndSend({ sslVisionId,
              x: self.pX,
              y: botY < MIN_POST ? (MIN_POST + 50) : (botY > MAX_POST ? (MAX_POST - 50) : botY),
              theta: self.pTheta
            });
          },
          trackRotation: (id: number) => {
            checks.id() || checks.id(id);

            const bot: any = gets.bot(id),
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
        self = sslVisionId < 0 ? self : gets.bot();
        lastUpdate = Date.now();
        if (mQ.length) {
          commsExec.send(gets.payload(mQ.shift()));
        } else {
          commsExec.resume(world);
        }
      } catch (e) {
        commsExec.resume(e, true);
      }
    };
  }

  return { // Methods exposed in client library.
    prompt: (msg: string) => commsExec.pauseAndPrompt(msg),
    setId: (id: number, dss: boolean = true) => {
      checks.id(id);
      dssBall = Boolean(dss);
      sslVisionId = id;

      return commsExec.pauseWaitAndSend(1);
    },
    getTime: () => Date.now(),
    getPosX: (id: number = sslVisionId) => commsExec.setFilterAndGet([true, id, 'pX']),
    getPosY: (id: number = sslVisionId) => commsExec.setFilterAndGet([true, id, 'pY']),
    getPosAngle: (id: number = sslVisionId) => commsExec.setFilterAndGet([true, id, 'pTheta']),
    getVelX: (id: number = sslVisionId) => commsExec.setFilterAndGet([true, id, 'vX']),
    getVelY: (id: number = sslVisionId) => commsExec.setFilterAndGet([true, id, 'vY']),
    getVelAngle: (id: number = sslVisionId) => commsExec.setFilterAndGet([true, id, 'vTheta']),
    getBallPosX: () => commsExec.setFilterAndGet([false, -1, 'pX']),
    getBallPosY: () => commsExec.setFilterAndGet([false, -1, 'pY']),
    getBallVelX: () => commsExec.setFilterAndGet([false, -1, 'vX']),
    getBallVelY: () => commsExec.setFilterAndGet([false, -1, 'vY']),
    wait: (time: number) => commsExec.pauseWaitAndSend(time),
    getMyXCell: () => maze.getBotXCell(),
    getMyYCell: () => maze.getBotYCell(),
    getMonsterXCell: (id: number) => maze.getBotXCell(id),
    getMonsterYCell: (id: number) => maze.getBotYCell(id),
    monsterNearby: (id: number) => maze.botNearby(id),
    moveForward: () => maze.moveForward(),
    moveByXCells: (n: number) => maze.moveByXCells(n),
    moveByYCells: (n: number) => maze.moveByYCells(n),
    turnLeft: () => maze.turn(Direction.Left),
    turnRight: () => maze.turn(Direction.Right),
    collidesX: (obsX: number, obsY: number, x1: number, y1: number, x2: number) =>
      maze.collides(obsX, obsY, x1, y1, x2, true),
    collidesY: (obsX: number, obsY: number, x1: number, y1: number, y2: number) =>
      maze.collides(obsX, obsY, x1, y1, y2, false),
    aimLeft: () => pk.aim(Direction.Left),
    aimRight: () => pk.aim(Direction.Right),
    aimCenter: () => pk.aim(Direction.Center),
    strike: () => pk.shoot(),
    strikeLeft: () => pk.shoot(Direction.Left),
    strikeRight: () => pk.shoot(Direction.Right),
    strikeCenter: () => pk.shoot(Direction.Center),
    blockLeft: () => pk.block(Direction.Left),
    blockRight: () => pk.block(Direction.Right),
    blockCenter: () => pk.block(Direction.Center),
    blockRandom: () => pk.blockRandom(),
    distanceTo: (x: number, y: number) => tag.distance(x, y),
    moveTo: (x: number, y: number, theta: number) => tag.move(x, y, angles.toRadians(theta)),
    moveToXY: (x: number, y: number) => tag.move(x, y, self.pTheta),
    moveToX: (x: number) => tag.move(x, self.pY, self.pTheta),
    moveToY: (y: number) => tag.move(self.pX, y, self.pTheta),
    turnTo: (theta: number) => tag.move(self.pX, self.pY, angles.toRadians(theta)),
    moveBy: (x: number, y: number, theta: number) => tag.move(x, y, angles.toRadians(theta), true),
    moveByXY: (x: number, y: number) => tag.move(x, y, 0, true),
    moveByX: (x: number) => tag.move(x, 0, 0, true),
    moveByY: (y: number) => tag.move(0, y, 0, true),
    turnBy: (theta: number) => tag.move(0, 0, angles.toRadians(theta), true),
    predictX: (id: number, time: number) => tag.project(id, time, true),
    predictY: (id: number, time: number) => tag.project(id, time),
    turnAroundBall: (theta: number) => soccer.rotate(angles.toRadians(theta)),
    catch: () => soccer.catchBall(),
    dribble: () => soccer.dribble(),
    shoot: () => soccer.shoot(),
    trackPosition: (id: number) => soccer.trackPosition(id),
    trackRotation: (id: number) => soccer.trackRotation(id)
  };
}
