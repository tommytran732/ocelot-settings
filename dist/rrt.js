function rrt(config) {
    function argCheck(func, p, paramTypes) {
        try {
            const n = paramTypes.length;
            if (p.length !== n) {
                throw new TypeError(`Invalid call to ${func}: ${n} arguments required but ${p.length} given`);
            }
            for (let i = 0; i < n; ++i) {
                const t = typeof (p[i]);
                if (t !== paramTypes[i]) {
                    throw new TypeError(`Invalid call to ${func}: argument ${i} expected ${paramTypes[i]} but ${t} given`);
                }
            }
        }
        catch (e) {
            if (e.toString().includes(`Invalid call to ${func}:`)) {
                throw (e);
            }
            else {
                throw new Error(`Invalid call to ${func}: ${e}`);
            }
        }
    }
    class Point {
        constructor(x, y) {
            argCheck('Point constructor', arguments, ['number', 'number']);
            this.x = x;
            this.y = y;
        }
    }
    class Line {
        constructor(p1, p2) {
            argCheck('Line constructor', arguments, ['object', 'object']);
            this.p1 = p1;
            this.p2 = p2;
        }
        length() {
            return distance(this.p1, this.p2);
        }
    }
    function checkIfPoint(p) {
        if (typeof (p) !== 'object' ||
            typeof (p.x) !== 'number' ||
            typeof (p.y) !== 'number') {
            throw new TypeError(`Invalid Point`);
        }
    }
    function checkIfLine(l) {
        checkIfPoint(l.p1);
        checkIfPoint(l.p2);
    }
    function perp(l) {
        return new Point(l.p1.y - l.p2.y, l.p2.x - l.p1.x);
    }
    function dot(p1, p2) {
        return p1.x * p2.x + p1.y * p2.y;
    }
    function minus(p1, p2) {
        return new Point(p1.x - p2.x, p1.y - p2.y);
    }
    function sq(x) {
        return x * x;
    }
    function distance(p1, p2) {
        return Math.sqrt(sq(p1.x - p2.x) + sq(p1.y - p2.y));
    }
    function pointOnLine(p, line) {
        const d = line.length();
        if (d > 0) {
            const dir = minus(line.p1, line.p2), prp = new Point(dir.y, -dir.x), projection = dot(minus(p, line.p2), dir) / d, collinear = dot(minus(p, line.p2), prp) === 0;
            return collinear && projection >= 0 && projection <= d;
        }
        else {
            return p.x === line.p1.x && p.y === line.p2.y;
        }
    }
    function getDemoMap() {
        return {
            size: 400,
            lines: config.stopifyArray([
                new Line(new Point(0, 0), new Point(0, 400)),
                new Line(new Point(400, 400), new Point(0, 400)),
                new Line(new Point(400, 400), new Point(400, 0)),
                new Line(new Point(400, 0), new Point(0, 0)),
                new Line(new Point(0, 200), new Point(300, 200)),
                new Line(new Point(0, 100), new Point(200, 100)),
                new Line(new Point(300, 100), new Point(400, 100)),
                new Line(new Point(100, 200), new Point(100, 300)),
                new Line(new Point(200, 300), new Point(200, 400)),
                new Line(new Point(300, 300), new Point(400, 300))
            ])
        };
    }
    function getIrregularObstacleMap() {
        return {
            size: 400,
            lines: config.stopifyArray([
                new Line(new Point(0, 0), new Point(0, 400)),
                new Line(new Point(400, 400), new Point(0, 400)),
                new Line(new Point(400, 400), new Point(400, 0)),
                new Line(new Point(400, 0), new Point(0, 0)),
                new Line(new Point(100, 50), new Point(50, 100)),
                new Line(new Point(25, 150), new Point(50, 100)),
                new Line(new Point(25, 150), new Point(150, 160)),
                new Line(new Point(160, 70), new Point(150, 160)),
                new Line(new Point(160, 70), new Point(100, 50)),
                new Line(new Point(200, 150), new Point(250, 100)),
                new Line(new Point(250, 50), new Point(250, 100)),
                new Line(new Point(250, 50), new Point(300, 50)),
                new Line(new Point(280, 150), new Point(300, 50)),
                new Line(new Point(280, 150), new Point(200, 200)),
                new Line(new Point(200, 150), new Point(200, 200)),
            ])
        };
    }
    function drawMap(canvas, map) {
        map.lines.forEach(line => {
            canvas.drawLine(line.p1.x, line.p1.y, line.p2.x, line.p2.y, [0, 0, 0]);
        });
    }
    function generateHardMap(mapSize, spacing, opening) {
        if (spacing <= 0) {
            throw new TypeError(`spacing must be greater than zero`);
        }
        if (Math.floor(spacing) !== spacing) {
            throw new TypeError(`spacing must be an integer`);
        }
        if (opening < 0 || opening > 1) {
            throw new TypeError(`opening must be greater than zero and less than one`);
        }
        const map = [
            new Line(new Point(0, 0), new Point(0, mapSize)),
            new Line(new Point(mapSize, mapSize), new Point(0, mapSize)),
            new Line(new Point(mapSize, mapSize), new Point(mapSize, 0)),
            new Line(new Point(mapSize, 0), new Point(0, 0))
        ];
        for (let y = 0; y < mapSize; y = y + spacing) {
            const x1 = Math.random() * (1 - opening) * mapSize;
            const x2 = x1 + opening * mapSize;
            map.push(new Line(new Point(0, y), new Point(x1, y)));
            map.push(new Line(new Point(x2, y), new Point(mapSize, y)));
        }
        return { lines: config.stopifyArray(map), size: mapSize };
    }
    return {
        getDemoMap,
        getIrregularObstacleMap,
        generateHardMap,
        drawMap,
        Point: function (x, y) {
            argCheck('Point constructor', arguments, ['number', 'number']);
            return new Point(x, y);
        },
        Line: function (p1, p2) {
            argCheck('Line constructor', arguments, ['object', 'object']);
            checkIfPoint(p1);
            checkIfPoint(p2);
            return new Line(p1, p2);
        },
        intersects: function (l1, l2) {
            argCheck('intersects', arguments, ['object', 'object']);
            checkIfLine(l1);
            checkIfLine(l2);
            if (l1.length() === 0) {
                return pointOnLine(l1.p1, l2);
            }
            else if (l2.length() === 0) {
                return pointOnLine(l2.p1, l1);
            }
            const n1 = perp(l1), n2 = perp(l2);
            const d1 = dot(n1, minus(l2.p1, l1.p1)), d2 = dot(n1, minus(l2.p2, l1.p1));
            const d3 = dot(n2, minus(l1.p1, l2.p1)), d4 = dot(n2, minus(l1.p2, l2.p1));
            if (d1 === 0 && d2 === 0 && d3 === 0 && d4 === 0) {
                return pointOnLine(l1.p1, l2) || pointOnLine(l1.p2, l2) ||
                    pointOnLine(l2.p1, l1) || pointOnLine(l2.p2, l1);
            }
            return (d1 * d2 <= 0 && d3 * d4 <= 0);
        }
    };
}
