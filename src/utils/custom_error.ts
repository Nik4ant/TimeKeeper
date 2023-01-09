/* Everything below was made in order to make error handling easier */

// Base error type that all other errors implement
export type ErrorType = {
    message: string
}

// Used as a return type for operations that either return value or fail in the process
export class Result<T, E extends ErrorType> {
    // Note: This may look wierd, but it only shows 2 cases:
    // 1) No error --> error is undefined
    // 2) Error occurred --> value is undefined

    // Contains value of the operation if no error occurred
    value: T | undefined
    // Contains error object if something went wrong
    error: E | undefined
    isOk: boolean

    constructor(value: T | undefined, isOk: boolean, error: E | undefined) {
        this.value = value;
        this.isOk = isOk;
        this.error = error;
    }

    static Ok<T, E extends ErrorType>(value: T): Result<T, E> {
        return new Result<T, E>(value, true, undefined);
    }

    static Err<E extends ErrorType>(error: E): Result<undefined, E> {
        return new Result<undefined, E>(undefined, false, error);
    }
}

// Used as a return type for void (no return value) operations that might fail in the process
export class Maybe<E extends ErrorType | undefined> {
    isOk: boolean
    error: E | undefined

    constructor(isOk: boolean, error: E | undefined) {
        this.isOk = isOk;
        this.error = error;
    }

    static Err<E extends ErrorType>(error: E): Maybe<E> {
        return new Maybe<E>(false, error);
    }

    static Ok(): Maybe<undefined> {
        return new Maybe<undefined>(true, undefined);
    }
}

// Function for printing error messages that never suppose to occur
export function Unreachable(message?: string): void {
    if (message === undefined) {
        console.error("Unpredictable error occurred with no error message. Contact developer if possible");
        alert("Unpredictable error occurred with no error message. Contact developer if possible");
    }
    else {
        console.error(`Unpredictable error occurred: "${message}".\n Contact developer if possible`);
        alert(`Unpredictable error occurred: "${message}".\n Contact developer if possible`);
    }
}