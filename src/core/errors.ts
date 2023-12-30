export class ServiceError extends Error {
    constructor(
        message: string,
        public status: number = 400,
        public requestId?: string,
    ) {
        super();

        this.name = this.constructor.name;
        this.message = message;
        this.status = status;
        this.requestId = requestId;
    }
}

export class ObjectInitializationError extends Error {
    constructor(message: string) {
        super();

        this.name = this.constructor.name;
        this.message = message;
    }
}
