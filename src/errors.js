/* eslint-disable max-classes-per-file */

const { StatusCodeError } = require('request-promise/errors');

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
    return JSON.stringify(
      {
        message,
        stack: stack && stack.split('\n'),
        ...this.requestDetails,
      },
      null,
      2,
    );
  }
}

module.exports = {
  ApiError,
};
