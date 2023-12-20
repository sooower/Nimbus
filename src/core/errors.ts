export class ServiceError extends Error {
    readonly requestId: string;
    readonly status: number;
    readonly code: string;
    readonly message: string;

    constructor(
        requestId: string,
        status: number,
        code: string,
        message: string,
    ) {
        super();
        this.requestId = requestId;
        this.status = status;
        this.code = code;
        this.message = message;
    }
}
