export class ServiceError extends Error {
    status: number;
    requestId?: string;

    constructor(
        message: string,
        status: number = 400,
        stack?: string,
        requestId?: string,
    ) {
        super(message);

        this.status = status;

        if (stack) {
            this.stack = stack;
        }
        if (requestId) {
            this.requestId = requestId;
        }
    }
}
