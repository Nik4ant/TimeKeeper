export class ValidationResult {
    isOk: boolean;
    htmlErrorMessage: string;

    constructor(isOk: boolean, htmlErrorMessage: string = "") {
        this.isOk = isOk;
        this.htmlErrorMessage = htmlErrorMessage;
    }
}

export class ChromeMessageContainer {
    command: string;
    args?: any[];

    constructor(command: string, args?: any[]) {
        this.command = command
        this.args = args;
    }
}