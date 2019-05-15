function robotLib(config) {
    let approach = 2, sslVisionId = -1, self, world;
    const mQ = [], checks = {
        id: (id = sslVisionId) => {
            if (!Number.isInteger(id) || id < 0 || id > 9) {
                throw Error(`Invalid robot number: ${id}.`);
            }
        },
        args: (x, y, theta, time) => {
            if (typeof x !== 'number' || typeof y !== 'number' || typeof theta !== 'number' ||
                typeof time !== 'number') {
                throw Error('Please pass numbers to the function.');
            }
            if (x < 100) {
                x = 100;
            }
            else if (x > 4300) {
                x = 4300;
            }
            if (y < -2800) {
                y = -2800;
            }
            else if (y > 2800) {
                y = 2800;
            }
            return [x, y, theta, time < 0 ? 0 : time];
        }
    }, gets = {
        payload: (cmd) => {
            if (cmd._fill) {
                cmd._fill();
                delete cmd._fill;
            }
            return cmd;
        },
        runnerResult: () => {
            const runnerResult = config.getRunner();
            if (runnerResult.kind === 'error') {
                throw Error('The program is not running.');
            }
            else {
                return runnerResult.value;
            }
        },
        robot: (id = sslVisionId) => {
            const botFound = world.ourBots.find(bot => bot.id === id);
            if (!botFound) {
                throw Error(`Robot ${id} not found.`);
            }
            else {
                return botFound;
            }
        }
    }, commsExec = {
        send: (payload) => {
            config.ws.send(JSON.stringify(payload));
        },
        resume: (value = world, isError = false) => {
            const runnerResult = gets.runnerResult();
            if (runnerResult.isRunning) {
                runnerResult.runner.continueImmediate({
                    type: isError ? 'exception' : 'normal',
                    stack: [], value
                });
            }
            else {
                runnerResult.onStopped();
            }
        },
        pauseAndSend: function (payload, delay = 0) {
            return gets.runnerResult().runner.pauseImmediate(() => {
                if (delay) {
                    window.setTimeout(this.send, delay, payload);
                }
                else {
                    this.send(payload);
                }
            });
        }
    }, pk = {
        aim: (direction) => {
            checks.id();
            let y, theta;
            switch (direction) {
                case 0:
                    y = 180;
                    theta = Math.PI / -9;
                    break;
                case 1:
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
        block: (direction) => {
            checks.id();
            const y = direction === 0 ? -500 :
                (direction === 1 ? 500 : 0);
            return commsExec.pauseAndSend({ x: 4300, y, theta: Math.PI, sslVisionId });
        },
        willMiss: (direction) => {
            const rand = Math.random();
            return ((direction === 0 && approach === 1) ||
                (direction === 1 && approach === 0)) ?
                rand < .3 : rand < .1;
        },
        shoot: function (kickDirection = approach) {
            checks.id();
            let y, theta, wide;
            switch (approach) {
                case 0:
                    y = 20;
                    theta = Math.PI / -9;
                    break;
                case 1:
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
                    case 0:
                        y = 20;
                        theta = Math.PI / (wide ? -7 : -9);
                        break;
                    case 1:
                        y = -20;
                        theta = Math.PI / (wide ? 7 : 9);
                        break;
                    default:
                        y = 0;
                        theta = wide ? Math.PI / (approach === 0 ? -7 : 7) : 0;
                }
                mQ.push({ x: 2850, y, theta, sslVisionId });
            }
            mQ.push({ kick: 1, sslVisionId });
            return commsExec.pauseAndSend(mQ.shift());
        }
    }, soccer = {
        kick: function () {
            checks.id();
            mQ.push({ kick: .1, sslVisionId });
            mQ.push({ sslVisionId, _fill: function () {
                    this.x = world.pX + (100 * Math.cos(self.pTheta - Math.PI));
                    this.y = world.pY + (100 * Math.sin(self.pTheta - Math.PI));
                    this.theta = self.pTheta;
                } });
            return commsExec.pauseAndSend(mQ.shift());
        },
    };
    if (config.ws) {
        config.ws.onmessage = (e) => {
            world = JSON.parse(e.data);
            try {
                self = sslVisionId < 0 ? self : gets.robot();
                if (mQ.length) {
                    commsExec.send(gets.payload(mQ.shift()));
                }
                else {
                    commsExec.resume();
                }
            }
            catch (e) {
                commsExec.resume(e, true);
            }
        };
    }
    return {
        setId: (id) => {
            checks.id(id);
            sslVisionId = id;
            commsExec.pauseAndSend({});
        },
        getWorld: () => {
            return commsExec.pauseAndSend({});
        },
        aimLeft: () => {
            return pk.aim(0);
        },
        aimRight: () => {
            return pk.aim(1);
        },
        aimCenter: () => {
            return pk.aim(2);
        },
        strike: () => {
            return pk.shoot();
        },
        strikeLeft: () => {
            return pk.shoot(0);
        },
        strikeRight: () => {
            return pk.shoot(1);
        },
        strikeCenter: () => {
            return pk.shoot(2);
        },
        blockLeft: () => {
            return pk.block(0);
        },
        blockCenter: () => {
            return pk.block(2);
        },
        blockRight: () => {
            return pk.block(1);
        },
        blockRandom: function () {
            const rand = Math.random();
            return rand < .333 ? this.blockLeft() :
                (rand < .667 ? this.blockCenter() : this.blockRight());
        },
        projectMove: (id, time) => {
            checks.id() && checks.id(id);
            time = checks.args(0, 0, 0, time)[3];
            const bot = gets.robot(id), pX = bot.pX + (bot.vX * time), pY = bot.pY + (bot.vY * time);
            return { pX, pY };
        },
        delayedMove: (x, y, theta, time) => {
            checks.id();
            [x, y, theta, time] = checks.args(x, y, theta, time);
            return commsExec.pauseAndSend({ x, y, theta, sslVisionId }, time);
        },
        distanceFrom: (x, y) => {
            checks.id();
            [x, y] = checks.args(x, y, 0, 0);
            return Math.sqrt(Math.pow(x - self.pX, 2) + Math.pow(y - self.pY, 2));
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
            return soccer.kick();
        }
    };
}
