import {
  FirestoreTimeoutError,
  withTimeout,
  firestoreRead,
  recoverFirestoreConnection,
} from './firestoreResilience';

jest.mock('../services/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  enableNetwork: jest.fn().mockResolvedValue(undefined),
}));

describe('firestoreResilience', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('withTimeout', () => {
    it('resolves when the promise completes before the timeout', async () => {
      const promise = Promise.resolve('ok');
      const result = await withTimeout(promise, 1000);
      expect(result).toBe('ok');
    });

    it('rejects with FirestoreTimeoutError when the promise does not settle in time', async () => {
      const promise = new Promise<string>(() => {});
      const resultPromise = withTimeout(promise, 1000);

      jest.advanceTimersByTime(1000);

      await expect(resultPromise).rejects.toBeInstanceOf(FirestoreTimeoutError);
    });

    it('rejects with the original error when the promise rejects', async () => {
      const error = new Error('permission-denied');
      const promise = Promise.reject(error);

      await expect(withTimeout(promise, 1000)).rejects.toThrow('permission-denied');
    });
  });

  describe('recoverFirestoreConnection', () => {
    it('calls enableNetwork on the Firestore instance', async () => {
      const { enableNetwork } = require('firebase/firestore');
      await recoverFirestoreConnection();
      expect(enableNetwork).toHaveBeenCalled();
    });
  });

  describe('firestoreRead', () => {
    it('retries once after recovering the connection', async () => {
      const { enableNetwork } = require('firebase/firestore');
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new FirestoreTimeoutError())
        .mockResolvedValueOnce('data');

      const result = await firestoreRead(fn);

      expect(result).toBe('data');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(enableNetwork).toHaveBeenCalled();
    });

    it('does not retry non-timeout Firestore errors', async () => {
      const { enableNetwork } = require('firebase/firestore');
      const fn = jest.fn().mockRejectedValue(new Error('Target ID already exists: 1008'));

      await expect(firestoreRead(fn)).rejects.toThrow('Target ID already exists: 1008');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(enableNetwork).not.toHaveBeenCalled();
    });
  });
});
