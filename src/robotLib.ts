function robotLib(config: any) {
  enum Direction { Left, Right, Center }

  const mQ: object[] = [];

  let approach: Direction = Direction.Center,
      sslVisionId: number = -1,
      self: any,
      world: any;

  function checkId(id?: number) {
    if ((Number.isInteger(id) && (id < 0 || id > 9)) ||
        (!Number.isInteger(id) && sslVisionId < 0)) {
      throw Error(
        'Please call "setId" with an integer between 0 and 9, before any robot commands.'
      );
    }
  }

  function getRunnerResult() {
    const runnerResult: any = config.getRunner();

    if (runnerResult.kind === 'error') {
      throw Error('Program is not running.');
    }

    return runnerResult.value;
  }

  function send(payload: any) {
    config.ws.send(JSON.stringify(payload));
  }

  function pauseAndSend(payload: any, delay?: number) {
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

  config.ws.onmessage = (e: any) => {
    const runnerResult: any = getRunnerResult();

    world = JSON.parse(e.data);
    self = world.ourBots[sslVisionId];

    if (mQ.length) {
      send(mQ.shift());
    } else {
      if (runnerResult.isRunning) {
        runnerResult.runner.continueImmediate({
          type: 'normal',
          value: world
        });
      } else {
        runnerResult.onStopped();
      }
    }
  };

  return {
    setId: (id: number) => {
      checkId(id);
      sslVisionId = id;
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
      checkId();

      let y: number,
          theta: number;

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

      mQ.push({ kick: true, sslVisionId });

      return pauseAndSend({ x: 2850, y, theta, sslVisionId });
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
    delayedMove: (x: number, y: number, theta: number, time: number) => {
      checkId();
      return pauseAndSend({ x, y, theta, sslVisionId }, time);
    },
    move: (x: number, y: number, theta: number) => {
      checkId();
      // TODO: Check args. Defaults?
      return pauseAndSend({ x, y, theta, sslVisionId });
    },
    kick: () => {
      checkId();
      return pauseAndSend({ kick: true, sslVisionId });
    }
  };
}
