import { StatusCodeError } from 'request-promise/errors';
import { prettyJson, stackToArray, IDetailedError } from './common';

export class ApiError extends Error implements IDetailedError {
  originalError: Error;

  action: string;

  message: string;

  constructor(error: Error, action: string) {
    super(error.message);
    this.action = action;
    this.message = `API request failed when trying to ${this.action} because: ${error.message}`;
    this.originalError = error;
  }

  private get requestDetails() {
    if (!(this.originalError instanceof StatusCodeError)) return {};
    const { method } = this.originalError.options;
    // The url parameter exists, but the types are not complete
    // eslint-disable-next-line
    // @ts-ignore
    const { url } = this.originalError.options;
    const { response } = this.originalError;
    return {
      request: { method, url },
      response,
    };
  }

  get details(): string {
    const { message, stack } = this;
    return prettyJson({
      message,
      stack: stackToArray(stack),
      ...this.requestDetails,
    });
  }
}
