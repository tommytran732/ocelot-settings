function robotLib(config) {
    let approach = 2, sslVisionId = -1, self, world;
    const MIN_X = 100, MAX_X = 4300, MIN_Y = -2800, MAX_Y = 2800, MIN_POST = -500, MAX_POST = 500, PK_BALL = 3000, mQ = [], checks = {
        angle: () => {
        },
        args: (x, y, theta, time) => {
            if (typeof x !== 'number' || typeof y !== 'number' || typeof theta !== 'number' ||
                typeof time !== 'number') {
                throw Error('Please pass numbers to the function.');
            }
            if (x < MIN_X) {
                x = MIN_X;
            }
            else if (x > MAX_X) {
                x = MAX_X;
            }
            if (y < MIN_Y) {
                y = MIN_Y;
            }
            else if (y > MAX_Y) {
                y = MAX_Y;
            }
            if (theta > 2 * Math.PI) {
                theta -= ((2 * Math.PI) * Math.trunc(theta / (2 * Math.PI)));
            }
            else if (theta < -2 * Math.PI) {
                theta += ((2 * Math.PI) * Math.trunc(theta / (-2 * Math.PI)));
            }
            return [x, y, theta, time < 0 ? 0 : time];
        },
        id: (id = sslVisionId) => {
            if (!Number.isInteger(id) || id < 0 || id > 9) {
                throw Error('Invalid robot number: ' + id);
            }
        },
        dist: () => {
            const dToBall = Math.sqrt(Math.pow(world.pX - self.pX, 2) +
                Math.pow(world.pY - self.pY, 2));
            if (dToBall > 300) {
                throw Error(Math.ceil(dToBall) + ' units is too far from ball; must be w/i 300.');
            }
            else if (dToBall > 150) {
                return true;
            }
        }
    }, gets = {
        ball: () => {
            return {
                pX: world.pX,
                pY: world.pY,
                vX: world.vX,
                vY: world.vY
            };
        },
        payload: (cmd) => {
            if (cmd._fill) {
                if (Math.abs(world.vX) > 0.1 || Math.abs(world.vY) > 0.1) {
                    mQ.push(Object.assign({}, cmd));
                }
                cmd._fill();
                delete cmd._fill;
            }
            return cmd;
        },
        robot: (id = sslVisionId) => {
            const botFound = world.ourBots.find(bot => bot.id === id) ||
                world.theirBots.find(bot => bot.id === id);
            if (!botFound) {
                throw Error('Robot not found: ' + id);
            }
            else {
                return botFound;
            }
        },
        runnerResult: () => {
            const runnerResult = config.getRunner();
            if (runnerResult.kind === 'error') {
                throw Error('The program is not running.');
            }
            else {
                return runnerResult.value;
            }
        }
    }, commsExec = {
        send: (payload) => {
            config.ws.send(JSON.stringify(payload));
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
        },
        resume: (value = world, isError = false) => {
            const runnerResult = gets.runnerResult();
            if (runnerResult.isRunning && runnerResult.runner.k) {
                runnerResult.runner.continueImmediate({
                    type: isError ? 'exception' : 'normal',
                    stack: [], value
                });
            }
            else {
                runnerResult.onStopped();
            }
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
            return commsExec.pauseAndSend({ x: PK_BALL - 500, y, theta, sslVisionId });
        },
        block: (direction) => {
            checks.id();
            return commsExec.pauseAndSend({ sslVisionId,
                x: MAX_X,
                y: direction === 0 ? MIN_POST :
                    (direction === 1 ? MAX_POST : 0),
                theta: Math.PI
            });
        },
        blockRandom: function () {
            const rand = Math.random();
            return rand < .333 ? this.block(0) :
                (rand < .667 ? this.block(2) : this.block(1));
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
            mQ.push({ sslVisionId, x: PK_BALL - 150, y, theta });
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
                mQ.push({ sslVisionId, x: PK_BALL - 150, y, theta });
            }
            mQ.push({ sslVisionId, kick: 1 });
            return commsExec.pauseAndSend(gets.payload(mQ.shift()));
        }
    }, tag = {
        distance: (x, y) => {
            checks.id();
            [x, y] = checks.args(x, y, 0, 0);
            return Math.sqrt(Math.pow(x - self.pX, 2) + Math.pow(y - self.pY, 2));
        },
        move: (x, y, theta, time) => {
            checks.id();
            [x, y, theta, time] = checks.args(x, y, theta, time);
            return commsExec.pauseAndSend({ sslVisionId, x, y, theta }, time);
        },
        project: (id, time) => {
            checks.id() || checks.id(id);
            time = checks.args(0, 0, 0, time)[3];
            const bot = gets.robot(id), pX = bot.pX + (bot.vX * time), pY = bot.pY + (bot.vY * time);
            return { pX, pY };
        }
    }, soccer = {
        _fill: function () {
            [this.x, this.y, this.theta] = checks.args(world.pX + (120 * Math.cos(self.pTheta - Math.PI)), world.pY + (120 * Math.sin(self.pTheta - Math.PI)), self.pTheta, 0);
        },
        _align: function (kick) {
            if (checks.id() || checks.dist()) {
                mQ.push({ sslVisionId, _fill: this._fill });
            }
            mQ.push({ sslVisionId, kick });
        },
        shoot: function (kick = 1) {
            this._align(kick);
            return commsExec.pauseAndSend(gets.payload(mQ.shift()));
        },
        dribble: function (kick = 0) {
            this._align(kick);
            mQ.push({ sslVisionId, _fill: this._fill });
            return commsExec.pauseAndSend(gets.payload(mQ.shift()));
        },
        rotate: (theta) => {
            checks.id() || checks.dist();
            theta = checks.args(0, 0, theta, 0)[2];
            return commsExec.pauseAndSend({ sslVisionId,
                x: world.pX + (120 * Math.cos(theta)),
                y: world.pY + (120 * Math.sin(theta)),
                theta: theta - Math.PI
            });
        },
        trackPosition: (id) => {
            checks.id() || checks.id(id);
            const botY = gets.robot(id).pY;
            return commsExec.pauseAndSend({ sslVisionId,
                x: self.pX,
                y: botY < MIN_POST ? MIN_POST : (botY > MAX_POST ? MAX_POST : botY),
                theta: self.pTheta
            });
        },
        trackRotation: (id) => {
            checks.id() || checks.id(id);
            const bot = gets.robot(id);
        }
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
        queryWorld: () => {
            return commsExec.pauseAndSend({});
        },
        filterBall: () => {
            return world ? gets.ball() : {};
        },
        filterBot: (id = sslVisionId) => {
            return (world && !checks.id(id)) ? gets.robot(id) : {};
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
        blockRight: () => {
            return pk.block(1);
        },
        blockCenter: () => {
            return pk.block(2);
        },
        blockRandom: () => {
            return pk.blockRandom();
        },
        delayMove: (x, y, theta, time) => {
            return tag.move(x, y, theta, time);
        },
        move: function (x, y, theta) {
            return this.delayMove(x, y, theta, 0);
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
        distanceFrom: (x, y) => {
            return tag.distance(x, y);
        },
        projectMove: (id, time) => {
            return tag.project(id, time);
        },
        dribble: () => {
            return soccer.dribble();
        },
        orient: (theta) => {
            return soccer.rotate(theta);
        },
        shoot: () => {
            return soccer.shoot();
        },
        trackPosition: (id) => {
            return soccer.trackPosition(id);
        }
    };
}
