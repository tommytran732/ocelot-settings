function robotLib(config: any) {
  let sslVisionId: number = -1,
      worldState: any;

  function checkId(id?: number) {
    if ((Number.isInteger(id) && (id < 0 || id > 9)) ||
        (!Number.isInteger(id) && sslVisionId < 0)) {
      throw Error(
        'Please call "setId" with an integer between 0 and 9, before any robot commands.'
      );
    }
  }

  function getRunnerResult() {
    const runnerResult = config.getRunner();

    if (runnerResult.kind === 'error') {
      throw Error('Program is not running.');
    }

    return runnerResult.value;
  }

  function send(payload: any) {
    return getRunnerResult().runner.pauseImmediate(() => {
      config.ws.send(JSON.stringify(payload));
    });
  }

  config.ws.onmessage = (e: any) => {
    const runnerResult = getRunnerResult();

    worldState = JSON.parse(e.data);
    if (runnerResult.isRunning) {
      runnerResult.runner.continueImmediate({
        type: 'normal',
        value: worldState
      });
    } else {
      runnerResult.onStopped();
    }
  };

  return {
    setId: (id: number) => {
      checkId(id);
      sslVisionId = id;
    },
    getWorld: () => {
      return send({});
    },
    move: (x: number, y: number, theta: number) => {
      checkId();
      // TODO: Check args. Defaults?
      return send({ x, y, theta, sslVisionId });
    },
    kick: () => {
      checkId();
      return send({ kick: true, sslVisionId });
    }
  };
}
