export class ServiceError extends Error {
    status: number;
    requestId?: string;

    constructor(
        message: string,
        status: number = 400,
        stack?: string,
        requestId?: string,
    ) {
        super();

        this.message = message;
        this.status = status;
        this.stack = stack ?? this.stack;
        this.requestId = requestId;
    }
}
