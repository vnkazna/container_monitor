import { HelpOptions } from '../utils/help';

export class HelpError extends Error {
  constructor(message: string, public readonly options?: HelpOptions) {
    super(message);
  }

  static isHelpError(object: any): object is HelpError {
    return object instanceof HelpError;
  }
}
