function robotLib(config) {
    let sslVisionId = -1, worldState;
    function checkId(id) {
        if ((Number.isInteger(id) && (id < 0 || id > 9)) ||
            (!Number.isInteger(id) && sslVisionId < 0)) {
            throw Error('Please call "setId" with an integer between 0 and 9, before any robot commands.');
        }
    }
    function getRunnerResult() {
        const runnerResult = config.getRunner();
        if (runnerResult.kind === 'error') {
            throw Error('Program is not running.');
        }
        return runnerResult.value;
    }
    function send(payload) {
        return getRunnerResult().runner.pauseImmediate(() => {
            config.ws.send(JSON.stringify(payload));
        });
    }
    config.ws.onmessage = (e) => {
        const runnerResult = getRunnerResult();
        worldState = JSON.parse(e.data);
        if (runnerResult.isRunning) {
            runnerResult.runner.continueImmediate({
                type: 'normal',
                value: worldState
            });
        }
        else {
            runnerResult.onStopped();
        }
    };
    return {
        setId: (id) => {
            checkId(id);
            sslVisionId = id;
        },
        getWorld: () => {
            return send({});
        },
        move: (x, y, theta) => {
            checkId();
            return send({ x, y, theta, sslVisionId });
        },
        kick: () => {
            checkId();
            return send({ kick: true, sslVisionId });
        }
    };
}
