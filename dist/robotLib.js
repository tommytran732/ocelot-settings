function robotLib(config) {
    let Direction;
    (function (Direction) {
        Direction[Direction["Left"] = 0] = "Left";
        Direction[Direction["Right"] = 1] = "Right";
        Direction[Direction["Center"] = 2] = "Center";
    })(Direction || (Direction = {}));
    let approach = Direction.Center, sslVisionId = -1, self, world;
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
    function aim(direction) {
        checkId();
        let y, theta;
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
        return send({ x: 2500, y, theta, sslVisionId });
    }
    function block(direction) {
        checkId();
        const y = direction === Direction.Left ? -500 :
            (direction === Direction.Right ? 500 : 0);
        return send({ x: 4300, y, theta: Math.PI, sslVisionId });
    }
    config.ws.onmessage = (e) => {
        const runnerResult = getRunnerResult();
        world = JSON.parse(e.data);
        self = world.ourBots[sslVisionId];
        if (runnerResult.isRunning) {
            runnerResult.runner.continueImmediate({
                type: 'normal',
                value: world
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
        aimLeft: () => {
            return aim(Direction.Left);
        },
        aimRight: () => {
            return aim(Direction.Right);
        },
        aimCenter: () => {
            return aim(Direction.Center);
        },
        approach: () => {
            checkId();
            let y, theta;
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
            return send({ x: 2850, y, theta, sslVisionId });
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
