class HttpError extends Error {
  constructor(statusCode, message, name = 'HttpError', details = null) {
    super(message);
    this.name = name;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function validationError(message, details) {
  return new HttpError(400, message, 'ValidationError', details);
}

function unprocessableError(message, details) {
  return new HttpError(422, message, 'UnprocessableEntityError', details);
}

function timeoutError(message) {
  return new HttpError(504, message, 'GatewayTimeoutError');
}

function internalError(message) {
  return new HttpError(500, message, 'InternalServerError');
}

module.exports = {
  HttpError,
  validationError,
  unprocessableError,
  timeoutError,
  internalError,
};
