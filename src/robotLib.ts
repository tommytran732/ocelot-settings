function robotLib(config: any) {
  enum Direction { Left, Right, Center }

  const mQ: object[] = [];

  let approach: Direction = Direction.Center,
      sslVisionId: number = -1,
      self: any,
      world: any;

  function checkId(id: number = sslVisionId) {
    if (!Number.isInteger(id) || id < 0 || id > 9) {
      throw Error(`Invalid robot number: ${id}.`);
    }
  }

  function checkArgs(x: number, y: number, theta: number, time: number) {
    if (typeof x !== 'number' || typeof y !== 'number' || typeof theta !== 'number' ||
        typeof time !== 'number') {
      throw Error('Please pass numbers to the function.');
    } else if (x < -4300 || x > 4300) {
      throw Error('Stay within the field; your x-coordinate must be between -4300 & 4300.');
    } else if (y < -2800 || y > 2800) {
      throw Error('Stay within the field; your y-coordinate must be between -2800 & 2800.');
    } else if (time < 0) {
      throw Error('Please pass a nonnegative number for delay; no time travel allowed.');
    }
  }

  function getRunnerResult() {
    const runnerResult: any = config.getRunner();

    if (runnerResult.kind === 'error') {
      throw Error('The program is not running.');
    } else {
      return runnerResult.value;
    }
  }

  function getRobot(id: number = sslVisionId) {
    const botFound: any = world.ourBots.find(bot => bot.id === id);

    if (!botFound) {
      throw Error(`Robot ${id} not found.`);
    } else {
      return botFound;
    }
  }

  function resume(value: any = world, isError: boolean = false) {
    const runnerResult: any = getRunnerResult();

    if (runnerResult.isRunning) {
      runnerResult.runner.continueImmediate({
        type: isError ? 'exception' : 'normal',
        stack: [], value
      });
    } else {
      runnerResult.onStopped();
    }
  }

  function send(payload: object) {
    config.ws.send(JSON.stringify(payload));
  }

  function pauseAndSend(payload: object, delay: number = 0) {
    return getRunnerResult().runner.pauseImmediate(() => {
      if (delay) {
        window.setTimeout(send, delay, payload);
      } else {
        send(payload);
      }
    });
  }

  function aim(direction: Direction) {
    checkId();

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

    return pauseAndSend({ x: 2500, y, theta, sslVisionId });
  }

  function block(direction: Direction) {
    checkId();

    const y: number = direction === Direction.Left ? -500 :
                      (direction === Direction.Right ? 500 : 0);

    return pauseAndSend({ x: 4300, y, theta: Math.PI, sslVisionId });
  }

  function willMiss(direction: Direction) {
    const rand = Math.random();

    return ((direction === Direction.Left && approach === Direction.Right) ||
            (direction === Direction.Right && approach === Direction.Left)) ?
            rand < .3 : rand < .1;
  }

  function shoot(kickDirection: Direction = approach) {
    checkId();

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
      wide = willMiss(kickDirection);

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

    mQ.push({ kick: true, sslVisionId });

    return pauseAndSend(mQ.shift());
  }

  // TODO: Guard to prevent Ocelot-beta crash while it doesn't support WS.
  if (config.ws) {
    config.ws.onmessage = (e: any) => {
      if (mQ.length) {
        send(mQ.shift());
      } else {
        world = JSON.parse(e.data);
        try {
          self = sslVisionId < 0 ? self : getRobot();
          resume();
        } catch (e) {
          resume(e, true);
        }
      }
    };
  }

  return {
    setId: (id: number) => {
      checkId(id);
      sslVisionId = id;
      pauseAndSend({});
    },
    getWorld: () => {
      return pauseAndSend({});
    },
    aimLeft: () => {
      return aim(Direction.Left);
    },
    aimRight: () => {
      return aim(Direction.Right);
    },
    aimCenter: () => {
      return aim(Direction.Center);
    },
    shoot: () => {
      return shoot();
    },
    shootLeft: () => {
      return shoot(Direction.Left);
    },
    shootRight: () => {
      return shoot(Direction.Right);
    },
    shootCenter: () => {
      return shoot(Direction.Center);
    },
    blockLeft: () => {
      return block(Direction.Left);
    },
    blockCenter: () => {
      return block(Direction.Center);
    },
    blockRight: () => {
      return block(Direction.Right);
    },
    blockRandom: function() {
      const rand = Math.random();
      return rand < .333 ? this.blockLeft() :
        (rand < .667 ? this.blockCenter() : this.blockRight());
    },
    projectMove: (id: number, time: number) => {
      checkId();
      checkId(id);
      checkArgs(0, 0, 0, time);

      const bot = getRobot(id),
            pX = bot.pX + (bot.vX * time),
            pY = bot.pY + (bot.vY * time);

      return { pX, pY };
    },
    delayedMove: (x: number, y: number, theta: number, time: number) => {
      checkId();
      checkArgs(x, y, theta, time);
      return pauseAndSend({ x, y, theta, sslVisionId }, time);
    },
    distanceFrom: (x: number, y: number) => {
      checkId();
      // checkArgs(x, y, 0, 1);
      return Math.sqrt(Math.pow(x - self.pX, 2) + Math.pow(y - self.pY, 2));
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
    kick: () => {
      checkId();
      return pauseAndSend({ kick: true, sslVisionId });
    }
  };
}
