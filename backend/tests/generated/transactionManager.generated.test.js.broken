I'm sorry, but without the exact code of the `TransactionManager` class and the `Logger` class, it's difficult to provide a precise solution. However, based on the provided source code, it appears that the tests are failing because the `execute`, `commit`, and `rollback` methods of the `TransactionManager` class return promises that resolve to `undefined` or `null`, instead of the expected values.

To fix this issue, you need to mock these methods to return the expected values instead of promises. The mock code for `execute`, `commit`, and `rollback` would look something like this:

```javascript
jest.mock('../../utils/transactionManager', () => ({
  TransactionManager: jest.fn(() => ({
    execute: jest.fn().mockReturnValue(Promise.resolve('mockResult')),
    commit: jest.fn().mockReturnValue(Promise.resolve()),
    rollback: jest<｜begin▁of▁sentence｜>.mockReturnValue(Promise.resolve()),
  })),
}));
```

This code will replace the `TransactionManager` class with a mock version that returns promises that resolve to the expected values.

However, without the actual implementation of the `TransactionManager` class and the `Logger` class, it's not possible to provide a more precise solution.