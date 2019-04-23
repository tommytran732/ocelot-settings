/*
 * We use rewire since since our modules are top-lvl fn declarations that aren't exported.
 * We can't just add an export since that'll break our module loading process.
 * What rewire allows one to do is access "private" (i.e. non-exported)
 *   members of a file (which in our case is a single fn declaration) for testing w/ Jest.
 */
const rewire = require('rewire');

describe('rrt', () => {
  let rrt: any;

  const getRunnerMock: jest.Mock<any, any> = jest.fn(),
      stopifyArrayMock: jest.Mock<any, any> = jest.fn(),
      stopifyObjectArrayRecurMock: jest.Mock<any, any> = jest.fn();

  beforeAll(() => {
    const _rrt = rewire('../dist/rrt');
    rrt = _rrt.__get__('rrt');

    rrt = rrt({
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

  test('Lines overlapping, share point', () => {
    const p1 = new rrt.Point(0, 0),
          p2 = new rrt.Point(0, 5),
          p3 = new rrt.Point(0, 5),
          p4 = new rrt.Point(6, 6),
          l1 = new rrt.Line(p1, p2),
          l2 = new rrt.Line(p3, p4);

     expect(rrt.intersects(l1, l2)).toBe(true);
  });

  test('Lines overlapping, colinear', () => {
    const p1 = new rrt.Point(0, 0),
          p2 = new rrt.Point(0, 5),
          p3 = new rrt.Point(0, 4),
          p4 = new rrt.Point(0, 6),
          l1 = new rrt.Line(p1, p2),
          l2 = new rrt.Line(p3, p4);

     expect(rrt.intersects(l1, l2)).toBe(true);
  });

  test('Lines overlapping', () => {
    const p1 = new rrt.Point(0, 0),
          p2 = new rrt.Point(0, 5),
          p3 = new rrt.Point(0, 5),
          p4 = new rrt.Point(0, 6),
          l1 = new rrt.Line(p1, p2),
          l2 = new rrt.Line(p3, p4);

    expect(rrt.intersects(l1, l2)).toBe(true);
  });

  test('Collinear nonintersecting lines', () => {
    const p1 = new rrt.Point(0, 0),
          p2 = new rrt.Point(2, 3),
          p3 = new rrt.Point(4, 6),
          p4 = new rrt.Point(6, 9),
          l1 = new rrt.Line(p1, p2),
          l2 = new rrt.Line(p3, p4);

    expect(rrt.intersects(l1, l2)).toBe(false);
  });

  test('Equal lines', () => {
    const p1 = new rrt.Point(1, 1),
          p2 = new rrt.Point(2, 2),
          p3 = new rrt.Point(1, 1),
          p4 = new rrt.Point(2, 2),
          l1 = new rrt.Line(p1, p2),
          l2 = new rrt.Line(p3, p4);

    expect(rrt.intersects(l1, l2)).toBe(true);
  });

  test('parallel but not intersecting lines', () => {
    const p1 = new rrt.Point(1, 1),
          p2 = new rrt.Point(2, 2),
          p3 = new rrt.Point(2, 1),
          p4 = new rrt.Point(3, 2),
          l1 = new rrt.Line(p1, p2),
          l2 = new rrt.Line(p3, p4);

    expect(rrt.intersects(l1, l2)).toBe(false);
  });

  test('Intersecting, not overlapping', () => {
    const p1 = new rrt.Point(5, 0),
          p2 = new rrt.Point(5, 10),
          p3 = new rrt.Point(0, 5),
          p4 = new rrt.Point(10, 5),
          l1 = new rrt.Line(p1, p2),
          l2 = new rrt.Line(p3, p4);

    expect(rrt.intersects(l1, l2)).toBe(true);
  });

  test('Overlapping lines', () => {
    const p1 = new rrt.Point(-1, -1),
          p2 = new rrt.Point(1, 1),
          p3 = new rrt.Point(-2, -2),
          p4 = new rrt.Point(3, 3),
          l1 = new rrt.Line(p1, p2),
          l2 = new rrt.Line(p3, p4);

    expect(rrt.intersects(l1, l2)).toBe(true);
  });

  test('Line One as point, no collision', () => {
    const p1 = new rrt.Point(5, 5),
          p2 = new rrt.Point(5, 5),
          p3 = new rrt.Point(10, 10),
          p4 = new rrt.Point(15, 10),
          l1 = new rrt.Line(p1, p2),
          l2 = new rrt.Line(p3, p4);

    expect(rrt.intersects(l1, l2)).toBe(false);
  });

  test('Line Two as point, no collision', () => {
    const p1 = new rrt.Point(10, 10),
          p2 = new rrt.Point(15, 10),
          p3 = new rrt.Point(5, 5),
          p4 = new rrt.Point(5, 5),
          l1 = new rrt.Line(p1, p2),
          l2 = new rrt.Line(p3, p4);

    expect(rrt.intersects(l1, l2)).toBe(false);
  });

  test('Both lines as point, no collision', () => {
    const p1 = new rrt.Point(5, 5),
          p2 = new rrt.Point(5, 5),
          p3 = new rrt.Point(10, 10),
          p4 = new rrt.Point(10, 10),
          l1 = new rrt.Line(p1, p2),
          l2 = new rrt.Line(p3, p4);

    expect(rrt.intersects(l1, l2)).toBe(false);
  });

  test('Line One as point, has collision', () => {
    const p1 = new rrt.Point(5, 5),
          p2 = new rrt.Point(5, 5),
          p3 = new rrt.Point(5, 0),
          p4 = new rrt.Point(5, 10),
          l1 = new rrt.Line(p1, p2),
          l2 = new rrt.Line(p3, p4);

    expect(rrt.intersects(l1, l2)).toBe(true);
  });

  test('Line Two as point, has collision', () => {
    const p1 = new rrt.Point(5, 0),
          p2 = new rrt.Point(5, 10),
          p3 = new rrt.Point(5, 5),
          p4 = new rrt.Point(5, 5),
          l1 = new rrt.Line(p1, p2),
          l2 = new rrt.Line(p3, p4);

    expect(rrt.intersects(l1, l2)).toBe(true);
  });

  test('Both lines as point, has collision', () => {
    const p1 = new rrt.Point(5, 5),
          p2 = new rrt.Point(5, 5),
          p3 = new rrt.Point(5, 5),
          p4 = new rrt.Point(5, 5),
          l1 = new rrt.Line(p1, p2),
          l2 = new rrt.Line(p3, p4);

    expect(rrt.intersects(l1, l2)).toBe(true);
  });

  test('Line as point, shared vertex collision', () => {
    const p1 = new rrt.Point(5, 5),
          p2 = new rrt.Point(5, 5),
          p3 = new rrt.Point(5, 5),
          p4 = new rrt.Point(5, 12),
          l1 = new rrt.Line(p1, p2),
          l2 = new rrt.Line(p3, p4);

    expect(rrt.intersects(l1, l2)).toBe(true);
  });

  test('Not intersection, not parallel or colinear', () => {
    let p1 = new rrt.Point(5, 0),
        p2 = new rrt.Point(5, 10),
        p3 = new rrt.Point(50, 50),
        p4 = new rrt.Point(60, 60),
        l1 = new rrt.Line(p1, p2),
        l2 = new rrt.Line(p3, p4);

    expect(rrt.intersects(l1, l2)).toBe(false);

    p1 = new rrt.Point(0, 0),
    p2 = new rrt.Point(0, 5),
    p3 = new rrt.Point(1, 1),
    p4 = new rrt.Point(3, 3),
    l1 = new rrt.Line(p1, p2),
    l2 = new rrt.Line(p3, p4);

    expect(rrt.intersects(l1, l2)).toBe(false);
  });

  test('Line One as point, no collision take 2', () => {
    const l1 = new rrt.Line(
      new rrt.Point(10, 10),
      new rrt.Point(10, 10)
    ), l2 = new rrt.Line(
      new rrt.Point(30, 4),
      new rrt.Point(30, 10)
    );
    expect(rrt.intersects(l1, l2)).toBe(false);
  });

  test('Lines touching', () => {
    const l1 = new rrt.Line(
      new rrt.Point(1, 1),
      new rrt.Point(10, 10)
    ), l2 = new rrt.Line(
      new rrt.Point(3, 3),
      new rrt.Point(3, 10)
    );
    expect(rrt.intersects(l1, l2)).toBe(true);
  });

  test('Point touching line', () => {
    const l1 = new rrt.Line(
      new rrt.Point(1, 1),
      new rrt.Point(1, 1)
    ), l2 = new rrt.Line(
      new rrt.Point(1, 1),
      new rrt.Point(3, 10)
    );
    expect(rrt.intersects(l1, l2)).toBe(true);
  });

  test('Touching lines', () => {
    const p1 = new rrt.Point(0, 10),
          p2 = new rrt.Point(20, 10),
          p3 = new rrt.Point(10, 10),
          p4 = new rrt.Point(10, 100),
          l1 = new rrt.Line(p1, p2),
          l2 = new rrt.Line(p3, p4);
    expect(rrt.intersects(l1, l2)).toBe(true);
  });
});
