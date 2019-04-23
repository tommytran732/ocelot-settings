/*
 * We use rewire since since our modules are top-lvl fn declarations that aren't exported.
 * We can't just add an export since that'll break our module loading process.
 * What rewire allows one to do is access "private" (i.e. non-exported)
 *   members of a file (which in our case is a single fn declaration) for testing w/ Jest.
 */
const rewire = require('rewire');

describe('lib220', () => {
  let lib220: any;

  const getRunnerMock: jest.Mock<any, any> = jest.fn(),
      stopifyArrayMock: jest.Mock<any, any> = jest.fn(),
      stopifyObjectArrayRecurMock: jest.Mock<any, any> = jest.fn();

  beforeAll(() => {
    const _lib220 = rewire('../dist/lib220');
    lib220 = _lib220.__get__('lib220');

    lib220 = lib220({
      getRunner: getRunnerMock,
      stopifyArray: stopifyArrayMock,
      stopifyObjectArrayRecur: stopifyObjectArrayRecurMock
    });
  });

  afterEach(() => {
     getRunnerMock.mockReset();
     stopifyArrayMock.mockReset();
     stopifyObjectArrayRecurMock.mockReset();
  });

  test('lib220 is defined', () => {
    expect(lib220).toEqual(expect.any(Object));
  });

  test('Incorrect getProperty usage', () => {
    expect.assertions(3);
    let obj: any = { x: 42 };

    expect(() => {
      lib220.getProperty(obj);
    }).toThrow(`2 arguments required but 1 given`);
    expect(() => {
      lib220.getProperty(obj, 4)
    }).toThrow(`argument 1 expected string but number given`);

    obj = 4;

    expect(() => {
      lib220.getProperty(obj, 'x')
    }).toThrow(`argument 0 expected object but number given`);
  });

  test('Safe object property getter', () => {
    expect.assertions(3);
    const obj = { x: 42 };

    expect(lib220.getProperty(obj, 'x').found).toBe(true);
    expect(lib220.getProperty(obj, 'x').value).toBe(42);
    expect(lib220.getProperty(obj, 'y').found).toBe(false);
  });

  test('non-browser loadJSONFromURL loads default object', () => {
    const obj = lib220.loadJSONFromURL('https://people.cs.umass.edu/~joydeepb/yelp.json');
    expect(obj.length).toBe(2);
  });

  test('non-browser loadImageFromURL loads default image', () => {
    const obj = lib220.loadImageFromURL('https://www.joydeepb.com/data/uploads/joydeepb.jpg');
    expect(obj.width).toBe(50);
  });

  describe('Intersects', () => {
    test('Lines overlapping, share point', () => {
      const p1 = new lib220.Point(0, 0),
            p2 = new lib220.Point(0, 5),
            p3 = new lib220.Point(0, 5),
            p4 = new lib220.Point(6, 6),
            l1 = new lib220.Line(p1, p2),
            l2 = new lib220.Line(p3, p4);

       expect(lib220.intersects(l1, l2)).toBe(true);
    });

    test('Lines overlapping, colinear', () => {
      const p1 = new lib220.Point(0, 0),
            p2 = new lib220.Point(0, 5),
            p3 = new lib220.Point(0, 4),
            p4 = new lib220.Point(0, 6),
            l1 = new lib220.Line(p1, p2),
            l2 = new lib220.Line(p3, p4);

       expect(lib220.intersects(l1, l2)).toBe(true);
    });

    test('Lines overlapping', () => {
      const p1 = new lib220.Point(0, 0),
            p2 = new lib220.Point(0, 5),
            p3 = new lib220.Point(0, 5),
            p4 = new lib220.Point(0, 6),
            l1 = new lib220.Line(p1, p2),
            l2 = new lib220.Line(p3, p4);

      expect(lib220.intersects(l1, l2)).toBe(true);
    });

    test('Collinear nonintersecting lines', () => {
      const p1 = new lib220.Point(0, 0),
            p2 = new lib220.Point(2, 3),
            p3 = new lib220.Point(4, 6),
            p4 = new lib220.Point(6, 9),
            l1 = new lib220.Line(p1, p2),
            l2 = new lib220.Line(p3, p4);

      expect(lib220.intersects(l1, l2)).toBe(false);
    });

    test('Equal lines', () => {
      const p1 = new lib220.Point(1, 1),
            p2 = new lib220.Point(2, 2),
            p3 = new lib220.Point(1, 1),
            p4 = new lib220.Point(2, 2),
            l1 = new lib220.Line(p1, p2),
            l2 = new lib220.Line(p3, p4);

      expect(lib220.intersects(l1, l2)).toBe(true);
    });

    test('parallel but not intersecting lines', () => {
      const p1 = new lib220.Point(1, 1),
            p2 = new lib220.Point(2, 2),
            p3 = new lib220.Point(2, 1),
            p4 = new lib220.Point(3, 2),
            l1 = new lib220.Line(p1, p2),
            l2 = new lib220.Line(p3, p4);

      expect(lib220.intersects(l1, l2)).toBe(false);
    });

    test('Intersecting, not overlapping', () => {
      const p1 = new lib220.Point(5, 0),
            p2 = new lib220.Point(5, 10),
            p3 = new lib220.Point(0, 5),
            p4 = new lib220.Point(10, 5),
            l1 = new lib220.Line(p1, p2),
            l2 = new lib220.Line(p3, p4);

      expect(lib220.intersects(l1, l2)).toBe(true);
    });

    test('Overlapping lines', () => {
      const p1 = new lib220.Point(-1, -1),
            p2 = new lib220.Point(1, 1),
            p3 = new lib220.Point(-2, -2),
            p4 = new lib220.Point(3, 3),
            l1 = new lib220.Line(p1, p2),
            l2 = new lib220.Line(p3, p4);

      expect(lib220.intersects(l1, l2)).toBe(true);
    });

    test('Line One as point, no collision', () => {
      const p1 = new lib220.Point(5, 5),
            p2 = new lib220.Point(5, 5),
            p3 = new lib220.Point(10, 10),
            p4 = new lib220.Point(15, 10),
            l1 = new lib220.Line(p1, p2),
            l2 = new lib220.Line(p3, p4);

      expect(lib220.intersects(l1, l2)).toBe(false);
    });

    test('Line Two as point, no collision', () => {
      const p1 = new lib220.Point(10, 10),
            p2 = new lib220.Point(15, 10),
            p3 = new lib220.Point(5, 5),
            p4 = new lib220.Point(5, 5),
            l1 = new lib220.Line(p1, p2),
            l2 = new lib220.Line(p3, p4);

      expect(lib220.intersects(l1, l2)).toBe(false);
    });

    test('Both lines as point, no collision', () => {
      const p1 = new lib220.Point(5, 5),
            p2 = new lib220.Point(5, 5),
            p3 = new lib220.Point(10, 10),
            p4 = new lib220.Point(10, 10),
            l1 = new lib220.Line(p1, p2),
            l2 = new lib220.Line(p3, p4);

      expect(lib220.intersects(l1, l2)).toBe(false);
    });

    test('Line One as point, has collision', () => {
      const p1 = new lib220.Point(5, 5),
            p2 = new lib220.Point(5, 5),
            p3 = new lib220.Point(5, 0),
            p4 = new lib220.Point(5, 10),
            l1 = new lib220.Line(p1, p2),
            l2 = new lib220.Line(p3, p4);

      expect(lib220.intersects(l1, l2)).toBe(true);
    });

    test('Line Two as point, has collision', () => {
      const p1 = new lib220.Point(5, 0),
            p2 = new lib220.Point(5, 10),
            p3 = new lib220.Point(5, 5),
            p4 = new lib220.Point(5, 5),
            l1 = new lib220.Line(p1, p2),
            l2 = new lib220.Line(p3, p4);

      expect(lib220.intersects(l1, l2)).toBe(true);
    });

    test('Both lines as point, has collision', () => {
      const p1 = new lib220.Point(5, 5),
            p2 = new lib220.Point(5, 5),
            p3 = new lib220.Point(5, 5),
            p4 = new lib220.Point(5, 5),
            l1 = new lib220.Line(p1, p2),
            l2 = new lib220.Line(p3, p4);

      expect(lib220.intersects(l1, l2)).toBe(true);
    });

    test('Line as point, shared vertex collision', () => {
      const p1 = new lib220.Point(5, 5),
            p2 = new lib220.Point(5, 5),
            p3 = new lib220.Point(5, 5),
            p4 = new lib220.Point(5, 12),
            l1 = new lib220.Line(p1, p2),
            l2 = new lib220.Line(p3, p4);

      expect(lib220.intersects(l1, l2)).toBe(true);
    });

    test('Not intersection, not parallel or colinear', () => {
      let p1 = new lib220.Point(5, 0),
          p2 = new lib220.Point(5, 10),
          p3 = new lib220.Point(50, 50),
          p4 = new lib220.Point(60, 60),
          l1 = new lib220.Line(p1, p2),
          l2 = new lib220.Line(p3, p4);

      expect(lib220.intersects(l1, l2)).toBe(false);

      p1 = new lib220.Point(0, 0),
      p2 = new lib220.Point(0, 5),
      p3 = new lib220.Point(1, 1),
      p4 = new lib220.Point(3, 3),
      l1 = new lib220.Line(p1, p2),
      l2 = new lib220.Line(p3, p4);

      expect(lib220.intersects(l1, l2)).toBe(false);
    });

    test('Line One as point, no collision take 2', () => {
      const l1 = new lib220.Line(
        new lib220.Point(10, 10),
        new lib220.Point(10, 10)
      ), l2 = new lib220.Line(
        new lib220.Point(30, 4),
        new lib220.Point(30, 10)
      );
      expect(lib220.intersects(l1, l2)).toBe(false);
    });

    test('Lines touching', () => {
      const l1 = new lib220.Line(
        new lib220.Point(1, 1),
        new lib220.Point(10, 10)
      ), l2 = new lib220.Line(
        new lib220.Point(3, 3),
        new lib220.Point(3, 10)
      );
      expect(lib220.intersects(l1, l2)).toBe(true);
    });

    test('Point touching line', () => {
      const l1 = new lib220.Line(
        new lib220.Point(1, 1),
        new lib220.Point(1, 1)
      ), l2 = new lib220.Line(
        new lib220.Point(1, 1),
        new lib220.Point(3, 10)
      );
      expect(lib220.intersects(l1, l2)).toBe(true);
    });

    test("Arjun's test: touching lines", () => {
      let p1 = new lib220.Point(0, 10);
      let p2 = new lib220.Point(20, 10);
      let p3 = new lib220.Point(10, 10);
      let p4 = new lib220.Point(10, 100);
      const l1 = new lib220.Line(p1, p2);
      const l2 = new lib220.Line(p3, p4);
      expect(lib220.intersects(l1, l2)).toBe(true);
    });
  });
});
