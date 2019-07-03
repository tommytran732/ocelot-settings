function robotLibrary(config) {
    let dssBall, self, world, approach = 2, lastUpdate = 0, returnFilter = [], sslVisionId = -1;
    const MIN_X = -1700, MAX_X = 1700, MIN_Y = -1100, MAX_Y = 1100, MIN_POST = -400, MAX_POST = 400, mQ = [], angles = {
        toDegrees: (angle) => angle * (180 / Math.PI),
        toRadians: (angle) => angle * (Math.PI / 180)
    }, checks = {
        args: (x, y, theta, time) => {
            if (typeof x !== 'number' || typeof y !== 'number' || typeof theta !== 'number' ||
                typeof time !== 'number') {
                throw Error('Please pass numbers to the function.');
            }
            if (x === -0) {
                x = 0;
            }
            if (y === -0) {
                y = 0;
            }
            if (theta === -0) {
                theta = 0;
            }
            if (time === -0) {
                time = 0;
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
            if (theta >= 2 * Math.PI) {
                theta -= ((2 * Math.PI) * Math.trunc(theta / (2 * Math.PI)));
            }
            else if (theta <= -2 * Math.PI) {
                theta += ((2 * Math.PI) * Math.trunc(theta / (-2 * Math.PI)));
            }
            return [x, y, theta, time < 0 ? 0 : time];
        },
        direction: function () {
            const theta = this.args(0, 0, self.pTheta, 0)[2], start = theta - (Math.PI / 4), final = theta + (Math.PI / 4), angle = Math.atan2(world.pY - self.pY, world.pX - self.pX);
            if ((angle < Math.min(start, final) || angle > Math.max(start, final)) &&
                (Math.abs(angle) < 3 ||
                    (-angle < Math.min(start, final) || -angle > Math.max(start, final)))) {
                throw Error('Robot must be facing the ball.');
            }
        },
        bounds: () => {
            if (world.pX < MIN_X - 110 || world.pX > MAX_X + 110 ||
                world.pY < MIN_Y - 110 || world.pY > MAX_Y + 110) {
                throw Error('Ball out of bounds.');
            }
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
                throw Error(Math.ceil(dToBall) + 'mm is too far from ball; must be within 300.');
            }
            else {
                return dToBall > 150;
            }
        },
        msg: (msg) => {
            if (!Object.keys(msg).length) {
                throw Error('No data found; make sure your simulator is running.');
            }
            else {
                return msg;
            }
        }
    }, gets = {
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
        bot: (id = sslVisionId) => {
            const botFound = (world.ourBots && world.ourBots.find(bot => bot.id === id)) ||
                (world.theirBots && world.theirBots.find(bot => bot.id === id));
            if (!botFound) {
                throw Error('Robot not found: ' + id);
            }
            else {
                return botFound;
            }
        },
        returnVal: function () {
            if (returnFilter.length) {
                let val;
                if (returnFilter[0] === true) {
                    checks.id(returnFilter[1]);
                    val = (returnFilter[2] === 'pTheta' || returnFilter[2] === 'vTheta') ?
                        angles.toDegrees(this.bot(returnFilter[1])[returnFilter[2]]) :
                        this.bot(returnFilter[1])[returnFilter[2]];
                }
                else if (returnFilter[0] === false) {
                    val = world[returnFilter[2]];
                }
                else {
                    val = returnFilter[0]();
                }
                return val;
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
        send: (payload) => config.ws.send(JSON.stringify(payload)),
        pauseAndSend: function (payload) {
            return gets.runnerResult().runner.pauseImmediate(() => this.send(payload));
        },
        pauseWaitAndSend: function (time) {
            time = checks.args(0, 0, 0, time)[3];
            return gets.runnerResult().runner.pauseImmediate(() => window.setTimeout(() => this.send({}), time * 1000));
        },
        resume: (value, isError = false) => {
            const runnerResult = gets.runnerResult();
            if (runnerResult.isRunning && runnerResult.runner.k) {
                const resumeContent = { stack: [] };
                if (isError) {
                    resumeContent.type = 'exception';
                    resumeContent.value = value;
                }
                else {
                    resumeContent.type = 'normal';
                    resumeContent.value = typeof value === 'object' ? gets.returnVal() : value;
                }
                returnFilter = [];
                runnerResult.runner.continueImmediate(resumeContent);
            }
            else {
                runnerResult.onStopped();
            }
        },
        pauseAndPrompt: function (msg) {
            return gets.runnerResult().runner.pauseImmediate(() => this.resume(window.prompt(msg) || ''));
        },
        setFilterAndGet: function (filter) {
            returnFilter = filter;
            return (Date.now() > lastUpdate + 100) ? this.pauseAndSend({}) : gets.returnVal();
        }
    }, maze = {
        _snapAngle: () => {
            let theta = checks.args(0, 0, self.pTheta, 0)[2];
            if (theta < 0) {
                if (theta > Math.PI / -4) {
                    theta = 0;
                }
                else if (theta > 3 * Math.PI / -4) {
                    theta = Math.PI / -2;
                }
                else if (theta > 5 * Math.PI / -4) {
                    theta = -Math.PI;
                }
                else if (theta > 7 * Math.PI / -4) {
                    theta = 3 * Math.PI / -2;
                }
                else {
                    theta = 0;
                }
            }
            else {
                if (theta < Math.PI / 4) {
                    theta = 0;
                }
                else if (theta < 3 * Math.PI / 4) {
                    theta = Math.PI / 2;
                }
                else if (theta < 5 * Math.PI / 4) {
                    theta = Math.PI;
                }
                else if (theta < 7 * Math.PI / 4) {
                    theta = 3 * Math.PI / 2;
                }
                else {
                    theta = 0;
                }
            }
            return theta;
        },
        _snapPosition: () => {
            let x = self.pX, y = self.pY;
            x = 400 * ((x < 0) ? Math.floor(Math.ceil(x / 200) / 2) :
                Math.ceil(Math.floor(x / 200) / 2));
            y = (y < 0) ? ((400 * Math.ceil(y / 400)) - 200) :
                ((400 * Math.floor(y / 400)) + 200);
            return [x, y];
        },
        moveForward: function () {
            checks.id();
            const theta = checks.args(0, 0, self.pTheta, 0)[2];
            let [x, y] = this._snapPosition();
            if (theta < 0) {
                if (theta > Math.PI / -4) {
                    x += 400;
                }
                else if (theta > 3 * Math.PI / -4) {
                    y -= 400;
                }
                else if (theta > 5 * Math.PI / -4) {
                    x -= 400;
                }
                else {
                    y += 400;
                }
            }
            else {
                if (theta < Math.PI / 4) {
                    x += 400;
                }
                else if (theta < 3 * Math.PI / 4) {
                    y += 400;
                }
                else if (theta < 5 * Math.PI / 4) {
                    x -= 400;
                }
                else {
                    y -= 400;
                }
            }
            [x, y] = checks.args(x, y, 0, 0);
            return commsExec.pauseAndSend({ sslVisionId, x, y, theta });
        },
        turn: function (direction) {
            checks.id();
            return commsExec.pauseAndSend({ sslVisionId,
                x: self.pX,
                y: self.pY,
                theta: checks.args(0, 0, this._snapAngle() + (Math.PI /
                    (direction === 0 ? 2 : -2)), 0)[2]
            });
        }
    }, pk = {
        _willMiss: (direction) => {
            const rand = Math.random();
            return ((direction === 0 && approach === 1) ||
                (direction === 1 && approach === 0)) ?
                rand < .3 : rand < .1;
        },
        aim: (direction) => {
            checks.id();
            let y, theta;
            switch (direction) {
                case 0:
                    y = 150;
                    theta = Math.PI / -12;
                    break;
                case 1:
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
        block: (direction) => {
            checks.id();
            return commsExec.pauseAndSend({ sslVisionId,
                x: MAX_X,
                y: direction === 0 ? (MIN_POST + 50) :
                    (direction === 1 ? (MAX_POST - 50) : 0),
                theta: Math.PI
            });
        },
        blockRandom: function () {
            const rand = Math.random();
            return rand < .333 ? this.block(0) :
                (rand < .667 ? this.block(2) : this.block(1));
        },
        shoot: function (kickDirection = approach) {
            checks.id();
            let wide, theta = approach === 0 ? Math.PI / -12 :
                (approach === 1 ? Math.PI / 12 : 0);
            mQ.push({ sslVisionId, theta, dssBall: true,
                x: world.pX + (120 * Math.cos(theta - Math.PI)),
                y: world.pY + (120 * Math.sin(theta - Math.PI)),
            });
            if (kickDirection !== approach) {
                wide = this._willMiss(kickDirection);
                switch (kickDirection) {
                    case 0:
                        theta = Math.PI / (wide ? -10 : -12);
                        break;
                    case 1:
                        theta = Math.PI / (wide ? 10 : 12);
                        break;
                    default:
                        theta = wide ? Math.PI / (approach === 0 ? -10 : 10) : 0;
                }
                mQ.push({ sslVisionId, theta, dssBall: true,
                    x: world.pX + (120 * Math.cos(theta - Math.PI)),
                    y: world.pY + (120 * Math.sin(theta - Math.PI)),
                });
            }
            mQ.push({ sslVisionId, kick: 1 });
            return commsExec.pauseAndSend(gets.payload(mQ.shift()));
        }
    }, tag = {
        distance: (x, y) => {
            checks.id();
            [x, y] = checks.args(x, y, 0, 0);
            return commsExec.setFilterAndGet([() => Math.sqrt(Math.pow(x - self.pX, 2) + Math.pow(y - self.pY, 2))]);
        },
        move: (x, y, theta, isRelative = false) => {
            checks.id() || checks.args(x, y, theta, 0);
            [x, y, theta] = isRelative ?
                checks.args(self.pX + x, self.pY + y, self.pTheta + theta, 0) :
                checks.args(x, y, theta, 0);
            return commsExec.pauseAndSend({ sslVisionId, dssBall, x, y, theta });
        },
        project: (id, time, isX = false) => {
            checks.id() || checks.id(id);
            time = checks.args(0, 0, 0, time)[3];
            return commsExec.setFilterAndGet([() => {
                    const bot = gets.bot(id);
                    return isX ? (bot.pX + (bot.vX * time)) : (bot.pY + (bot.vY * time));
                }]);
        }
    }, soccer = {
        _fill: function () {
            this.dssBall = true;
            [this.x, this.y, this.theta] = checks.args(world.pX + (120 * Math.cos(self.pTheta - Math.PI)), world.pY + (120 * Math.sin(self.pTheta - Math.PI)), self.pTheta, 0);
        },
        _align: function (kick) {
            checks.id();
            checks.bounds();
            checks.dist();
            checks.direction();
            checks.dist() && mQ.push({ sslVisionId, _fill: this._fill });
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
            return commsExec.pauseAndSend({ sslVisionId, dssBall: true,
                x: world.pX + (120 * Math.cos(theta)),
                y: world.pY + (120 * Math.sin(theta)),
                theta: checks.args(0, 0, theta - Math.PI, 0)[2]
            });
        },
        trackPosition: (id) => {
            checks.id() || checks.id(id);
            const botY = gets.bot(id).pY;
            return commsExec.pauseAndSend({ sslVisionId,
                x: self.pX,
                y: botY < MIN_POST ? (MIN_POST + 50) : (botY > MAX_POST ? (MAX_POST - 50) : botY),
                theta: self.pTheta
            });
        },
        trackRotation: (id) => {
            checks.id() || checks.id(id);
            const bot = gets.bot(id), botTheta = checks.args(0, 0, bot.pTheta, 0)[2], target = (bot.pX > 0 && self.pX > 0) ?
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
    if (config.ws) {
        config.ws.onmessage = (e) => {
            try {
                world = checks.msg(JSON.parse(e.data));
                self = sslVisionId < 0 ? self : gets.bot();
                lastUpdate = Date.now();
                if (mQ.length) {
                    commsExec.send(gets.payload(mQ.shift()));
                }
                else {
                    commsExec.resume(world);
                }
            }
            catch (e) {
                commsExec.resume(e, true);
            }
        };
    }
    return {
        prompt: (msg) => commsExec.pauseAndPrompt(msg),
        wait: (time) => commsExec.pauseWaitAndSend(time),
        setId: (id, dss = true) => {
            checks.id(id);
            dssBall = Boolean(dss);
            sslVisionId = id;
            return commsExec.pauseWaitAndSend(1);
        },
        getBallPosX: () => commsExec.setFilterAndGet([false, -1, 'pX']),
        getBallPosY: () => commsExec.setFilterAndGet([false, -1, 'pY']),
        getBallVelX: () => commsExec.setFilterAndGet([false, -1, 'vX']),
        getBallVelY: () => commsExec.setFilterAndGet([false, -1, 'vY']),
        getBotPosX: (id = sslVisionId) => commsExec.setFilterAndGet([true, id, 'pX']),
        getBotPosY: (id = sslVisionId) => commsExec.setFilterAndGet([true, id, 'pY']),
        getBotPosAngle: (id = sslVisionId) => commsExec.setFilterAndGet([true, id, 'pTheta']),
        getBotVelX: (id = sslVisionId) => commsExec.setFilterAndGet([true, id, 'vX']),
        getBotVelY: (id = sslVisionId) => commsExec.setFilterAndGet([true, id, 'vY']),
        getBotVelAngle: (id = sslVisionId) => commsExec.setFilterAndGet([true, id, 'vTheta']),
        moveForward: () => maze.moveForward(),
        turnLeft: () => maze.turn(0),
        turnRight: () => maze.turn(1),
        aimLeft: () => pk.aim(0),
        aimRight: () => pk.aim(1),
        aimCenter: () => pk.aim(2),
        strike: () => pk.shoot(),
        strikeLeft: () => pk.shoot(0),
        strikeRight: () => pk.shoot(1),
        strikeCenter: () => pk.shoot(2),
        blockLeft: () => pk.block(0),
        blockRight: () => pk.block(1),
        blockCenter: () => pk.block(2),
        blockRandom: () => pk.blockRandom(),
        moveTo: (x, y, theta) => tag.move(x, y, angles.toRadians(theta)),
        moveToXY: (x, y) => tag.move(x, y, self.pTheta),
        moveToX: (x) => tag.move(x, self.pY, self.pTheta),
        moveToY: (y) => tag.move(self.pX, y, self.pTheta),
        turnTo: (theta) => tag.move(self.pX, self.pY, angles.toRadians(theta)),
        moveBy: (x, y, theta) => tag.move(x, y, angles.toRadians(theta), true),
        moveByXY: (x, y) => tag.move(x, y, 0, true),
        moveByX: (x) => tag.move(x, 0, 0, true),
        moveByY: (y) => tag.move(0, y, 0, true),
        turnBy: (theta) => tag.move(0, 0, angles.toRadians(theta), true),
        projectX: (id, time) => tag.project(id, time, true),
        projectY: (id, time) => tag.project(id, time),
        distanceTo: (x, y) => tag.distance(x, y),
        dribble: () => soccer.dribble(),
        shoot: () => soccer.shoot(),
        turnAroundBall: (theta) => soccer.rotate(angles.toRadians(theta)),
        trackPosition: (id) => soccer.trackPosition(id),
        trackRotation: (id) => soccer.trackRotation(id)
    };
}
