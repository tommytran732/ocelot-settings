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
});
