/* eslint-disable max-classes-per-file */

const { StatusCodeError } = require('request-promise/errors');

const prettyJson = obj => JSON.stringify(obj, null, 2);
const stackToArray = stack => stack && stack.split('\n');

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

class UserFriendlyError extends Error {
  constructor(message, originalError, additionalInfo) {
    super(message);
    this.originalError = originalError;
    this.additionalInfo = additionalInfo;
  }

  get details() {
    return prettyJson({
      userMessage: this.message,
      errorMessage: this.originalError.message,
      stack: stackToArray(this.originalError.stack),
      additionalInfo: this.additionalInfo,
    });
  }
}

module.exports = {
  ApiError,
  UserFriendlyError,
};
