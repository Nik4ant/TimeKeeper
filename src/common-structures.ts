export class ValidationResult {
    isOk: boolean;
    htmlErrorMessage: string;

    constructor(isOk: boolean, htmlErrorMessage: string = "") {
        this.isOk = isOk;
        this.htmlErrorMessage = htmlErrorMessage;
    }
}

// TODO: rename later (ChromeMessage or smth like that)
export class CommandMessage {
    command: string;
    args?: any[];

    constructor(command: string, args?: any[]) {
        this.command = command
        this.args = args;
    }
}