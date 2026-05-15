class NotFoundError extends Error {
  constructor(message?: string) {
    super(message || "Resource not found");
    this.name = "NotFoundError";
  }
}

class InvalidArgumentsError extends Error {
  constructor(message?: string) {
    super(message || "Argument was not of correct type");
    this.name = "InvalidArugmentsError";
  }
}

class RateLimitError extends Error {
  constructor(message?: string) {
    super(
      message || "Rate limit exceeded. Please wait a minute and try again.",
    );
    this.name = "RateLimitError";
  }
}

export { NotFoundError, InvalidArgumentsError, RateLimitError };
