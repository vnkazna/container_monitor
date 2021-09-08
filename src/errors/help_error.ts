import { HelpOptions } from '../utils/help';

export class HelpError extends Error {
  constructor(message: string, public readonly options?: HelpOptions) {
    super(message);
  }
}
