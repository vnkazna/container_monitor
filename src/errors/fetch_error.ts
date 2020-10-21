import { prettyJson, stackToArray, IDetailedError } from './common';

export class FetchError extends Error implements IDetailedError {
  response: Response;

  constructor(message: string, response: Response) {
    super(message);
    this.response = response;
  }

  private get requestDetails() {
    return {
      response: {
        status: this.response.status,
        headers: this.response.headers,
      },
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
