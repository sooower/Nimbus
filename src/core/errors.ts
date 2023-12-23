export class ServiceError extends Error {
    readonly requestId: string;
    readonly status: number;
    readonly code: number;
    readonly message: string;

    constructor(
        requestId: string,
        status: number,
        code: number,
        message: string,
        stack?: string,
    ) {
        super();
        this.requestId = requestId;
        this.status = status;
        this.code = code;
        this.message = message;
        this.stack = stack;
    }
}
