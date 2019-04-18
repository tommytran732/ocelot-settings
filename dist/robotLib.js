function robotLib(config) {
    let Direction;
    (function (Direction) {
        Direction[Direction["Left"] = 0] = "Left";
        Direction[Direction["Right"] = 1] = "Right";
        Direction[Direction["Center"] = 2] = "Center";
    })(Direction || (Direction = {}));
    const mQ = [];
    let approach = Direction.Center, sslVisionId = -1, self, world;
    function checkId(id = sslVisionId) {
        if (!Number.isInteger(id) || id < 0 || id > 9) {
            throw Error('Please call "setId" with a robot number, before any robot commands.');
        }
    }
    function checkArgs(x, y, theta, time) {
        if (typeof x !== 'number' || typeof y !== 'number' || typeof theta !== 'number' ||
            typeof time !== 'number') {
            throw Error('Please pass numbers to the function.');
        }
        else if (x < -4300 || x > 4300) {
            throw Error('Stay within the field; your x-coordinate must be between -4300 & 4300.');
        }
        else if (y < -2800 || y > 2800) {
            throw Error('Stay within the field; your y-coordinate must be between -2800 & 2800.');
        }
        else if (time < 0) {
            throw Error('Please pass a nonnegative number for delay; no time travel allowed.');
        }
    }
    function getRunnerResult() {
        const runnerResult = config.getRunner();
        if (runnerResult.kind === 'error') {
            throw Error('The program is not running.');
        }
        else {
            return runnerResult.value;
        }
    }
    function getRobot(id = sslVisionId) {
        const botFound = world.ourBots.find(bot => bot.id === id);
        if (!botFound) {
            throw Error(`Robot ${id} not found.`);
        }
        else {
            return botFound;
        }
    }
    function resume(value, isError = false) {
        const runnerResult = getRunnerResult();
        if (runnerResult.isRunning) {
            runnerResult.runner.continueImmediate({
                type: isError ? 'exception' : 'normal',
                stack: [], value
            });
        }
        else {
            runnerResult.onStopped();
        }
    }
    function send(payload) {
        config.ws.send(JSON.stringify(payload));
    }
    function pauseAndSend(payload, delay = 0) {
        return getRunnerResult().runner.pauseImmediate(() => {
            if (delay) {
                window.setTimeout(send, delay, payload);
            }
            else {
                send(payload);
            }
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
        return pauseAndSend({ x: 2500, y, theta, sslVisionId });
    }
    function block(direction) {
        checkId();
        const y = direction === Direction.Left ? -500 :
            (direction === Direction.Right ? 500 : 0);
        return pauseAndSend({ x: 4300, y, theta: Math.PI, sslVisionId });
    }
    function willMiss(direction) {
        const rand = Math.random();
        return ((direction === Direction.Left && approach === Direction.Right) ||
            (direction === Direction.Right && approach === Direction.Left)) ?
            rand < .3 : rand < .1;
    }
    function shoot(kickDirection = approach) {
        checkId();
        let y, theta, wide;
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
    if (config.ws) {
        config.ws.onmessage = (e) => {
            world = JSON.parse(e.data);
            try {
                self = getRobot();
            }
            catch (e) {
                resume(e, true);
            }
            if (mQ.length) {
                send(mQ.shift());
            }
            else {
                resume(world);
            }
        };
    }
    return {
        setId: (id) => {
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
        blockRandom: function () {
            const rand = Math.random();
            return rand < .333 ? this.blockLeft() :
                (rand < .667 ? this.blockCenter() : this.blockRight());
        },
        delayedMove: (x, y, theta, time) => {
            checkId();
            checkArgs(x, y, theta, time);
            return pauseAndSend({ x, y, theta, sslVisionId }, time);
        },
        move: function (x, y, theta) {
            return this.delayedMove(x, y, theta, 0);
        },
        moveXY: function (x, y) {
            return this.move(x, y, self.pTheta, 0);
        },
        moveX: function (x) {
            return this.moveXY(x, self.pY);
        },
        moveY: function (y) {
            return this.moveXY(self.pX, y);
        },
        rotate: function (theta) {
            return this.move(self.pX, self.pY, theta, 0);
        },
        kick: () => {
            checkId();
            return pauseAndSend({ kick: true, sslVisionId });
        }
    };
}
