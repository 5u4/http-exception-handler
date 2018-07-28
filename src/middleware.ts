
// We are only importing type definitions from express, therefore this import statement
// disappears after compilation.
import { NextFunction, Request, Response } from 'express';

import { HttpException } from './HttpExceptions/HttpException';

/**
 * WARNING: public API. If this interface changes, then it is a BREAKING change (bump module major version).
 */
interface IExceptionDescriptor {
    statusCode: number;
    message: string;
    stackTrace?: string;
}

type ResponseFormat = 'json' | 'text';


/**
 * An express-compatible middleware to catch all errors.
 *
 * Use like this:
 *
 * ```ts
 * import { middleware as exceptionReporter } from 'express-http-exceptions';
 * 
 * app.use(exceptionReporter());
 * ```
 */
export function middleware() {
    return (err: any, req: Request, res: Response, next: NextFunction) => {
        const descriptor = createErrorDescriptor(err);
        sendException(req, res, descriptor);
    }
}

/**
 * Converts an unknown error type into a precise description of the error that
 * we can easily report.
 */
function createErrorDescriptor(err: any): IExceptionDescriptor {
    if (err instanceof HttpException) {
        return {
            message: err.getMessage(),
            stackTrace: err.stack,
            statusCode: err.getStatusCode()
        };
    } else {
        return {
            message: err.message ? err.message : err.toString(),
            stackTrace: err.stack,
            statusCode: 500
        }
    }
}

/**
 * Reports the description of an error back to the user while respecting the 'Accept' header if possible.
 */
function sendException(req: Request, res: Response, err: IExceptionDescriptor): Response {
    switch (getPreferredResponseFormat(req)) {
        case 'json':
            return res.status(err.statusCode).json(err);
        case 'text':
            return res.status(err.statusCode).contentType('text/plain').send(formatTextResponse(err));
    }
}

/**
 * Figures out what response format is the most appropriate given some request.
 */
function getPreferredResponseFormat(req: Request): ResponseFormat {
    const acceptHeader = req.header('Accept');
    if (acceptHeader != null && acceptHeader.indexOf('application/json') !== -1) {
        return 'json';
    }
    return 'text';
}

function formatTextResponse(err: IExceptionDescriptor): string {
    return (err.message ? err.message : 'Unknown error') + '\n' + (err.stackTrace ? err.stackTrace : '');
}
