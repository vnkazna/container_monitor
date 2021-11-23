import { handleError } from '../log';

export const wrapWithCatch =
  (command: (...args: unknown[]) => unknown) =>
  async (...args: unknown[]) => {
    try {
      await command(...args);
    } catch (e) {
      handleError(e);
    }
  };
