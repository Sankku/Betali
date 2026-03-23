const Logger = require('../../utils/Logger').Logger;

describe('Logger Utility', () => {
  let logger;

  beforeEach(() => {
    logger = new Logger('TestContext');
    // Mock console to avoid noise during tests
    console.log = jest.fn();
    console.error = jest<｜begin▁of▁sentence｜>fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create an instance with the correct context', () => {
    expect(logger.context).toBe('TestContext');
  });

  it('should log info messages', () => {
    logger.info('Test message');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('INFO'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Test message'));
  });

  it('should log error messages with objects', () => {
    logger.error('Error occurred', { detail: 'something went wrong' });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('ERROR'));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('something went wrong'));
  });
});