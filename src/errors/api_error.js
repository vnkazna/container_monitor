const { StatusCodeError } = require('request-promise/errors');
const { prettyJson, stackToArray } = require('./common');

class ApiError extends Error {
  constructor(error, action) {
    super(error);
    this.action = action;
    this.message = `API request failed when trying to ${this.action} because: ${error.message}`;
    this.originalError = error;
  }

  get requestDetails() {
    if (!(this.originalError instanceof StatusCodeError)) return {};
    const { method, url } = this.originalError.options;
    const { response } = this.originalError;
    return {
      request: { method, url },
      response,
    };
  }

  get details() {
    const { message, stack } = this;
    return prettyJson({
      message,
      stack: stackToArray(stack),
      ...this.requestDetails,
    });
  }
}

module.exports = { ApiError };
