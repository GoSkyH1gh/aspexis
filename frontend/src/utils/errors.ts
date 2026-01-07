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

export { NotFoundError, InvalidArgumentsError }
