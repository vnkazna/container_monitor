import { prettyJson, stackToArray, IDetailedError } from './common';

export class UserFriendlyError extends Error implements IDetailedError {
  originalError: Error;

  additionalInfo?: string;

  constructor(message: string, originalError: Error, additionalInfo?: string) {
    super(message);
    this.originalError = originalError;
    this.additionalInfo = additionalInfo;
  }

  get details(): string {
    return prettyJson({
      userMessage: this.message,
      errorMessage: this.originalError.message,
      stack: stackToArray(this.originalError.stack),
      additionalInfo: this.additionalInfo,
    });
  }
}
