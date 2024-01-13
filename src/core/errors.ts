export class ServiceError extends Error {
    constructor(message: string);
    constructor(
        message: string,
        public status: number = 400,
        public requestId?: string,
    ) {
        super(message);

        this.name = this.constructor.name;
        this.status = status;
        this.requestId = requestId;
    }
}

export class ObjectInitializationError extends ServiceError {
    constructor(message: string) {
        super(message);
    }
}

export class RouteInitializationError extends ServiceError {
    constructor(message: string) {
        super(message);
    }
}

export class AuthorizationError extends ServiceError {
    constructor(message: string) {
        super(message);
    }
}

export class AuthenticationError extends ServiceError {
    constructor(message: string) {
        super(message);
    }
}

export class ValidationError extends ServiceError {
    constructor(message: string) {
        super(message);
    }
}

export class CacheError extends ServiceError {
    constructor(message: string) {
        super(message);
    }
}

export class DecoratorError extends ServiceError {
    constructor(message: string) {
        super(message);
    }
}
