import {
  FirestoreTimeoutError,
  withTimeout,
  firestoreRead,
  recoverFirestoreConnection,
} from './firestoreResilience';

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
    it('waits before allowing a retry', async () => {
      const recoveryPromise = recoverFirestoreConnection();
      let settled = false;
      void recoveryPromise.then(() => {
        settled = true;
      });

      jest.advanceTimersByTime(499);
      await Promise.resolve();
      expect(settled).toBe(false);

      jest.advanceTimersByTime(1);
      await recoveryPromise;
      expect(settled).toBe(true);
    });
  });

  describe('firestoreRead', () => {
    it('retries once after recovering the connection', async () => {
      jest.useRealTimers();
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new FirestoreTimeoutError())
        .mockResolvedValueOnce('data');

      const result = await firestoreRead(fn, 100);

      expect(result).toBe('data');
      expect(fn).toHaveBeenCalledTimes(2);
      jest.useFakeTimers();
    });

    it('does not retry non-timeout Firestore errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Target ID already exists: 1008'));

      await expect(firestoreRead(fn)).rejects.toThrow('Target ID already exists: 1008');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
