import {createSignal} from "solid-js";
import {ErrorType, Maybe, Result, Unreachable} from "./custom_error";

// Base type for messages
export abstract class MessageType {
    toReceiver: string;
    // Indicates if message is designed to work with async function
    readonly isAsync: boolean = false;
    // Used to distinguish messages
    // Note: There is no better/cleaner way to check message type (trust me, I've tried...)
    abstract readonly messageName: string;

    protected constructor(toReceiver: string) {
       this.toReceiver = toReceiver;
    }
}
// Type for messages receiver
type Receiver = {
    name: string,
    onMessageReceived: (message: MessageType) => any;
}
/*
Note: 99% of problems with messaging system is based on the fact that
"abstract static" feature doesn't exist at the moment. The existing workarounds are all kinda bad
and this is what I would call "good enough"...
*/
// Base interface for background API that relies on messaging
export class MessageBasedApi {
    // Unique name for message receiver associated with the API.
    // Note: Default value is set to undefined because child APIs MUST implement it
    protected static MESSAGE_RECEIVER_NAME: string = undefined;

    protected static OnNewMessageReceived(message: MessageType): any {
        // This is used to force child APIs overwrite this function (it must be overwritten)
        throw new Error(`OnNewMessage isn't implemented for "${message.toReceiver}", but must be!`);
    }

    // Init method that checks receiver name and adds a receiver for an API
    static _InitForBackground() {
        // Check to make sure that value was overwritten (it must be)
        if (this.MESSAGE_RECEIVER_NAME === undefined) {
            // Otherwise extension can't continue working, so error time... :(
            throw new Error("Receiver name for an API isn't implemented, but must be!");
        }
        MessageUtil.AddReceiver(this.MESSAGE_RECEIVER_NAME, this.OnNewMessageReceived);
    }
}

export class MessageReceiverNotExist implements ErrorType {
    message: string;
    toReceiver: string;

    constructor(toReceiver: string) {
        this.toReceiver = toReceiver;
        this.message = `Unpredictable error! Can't send message to not existing receiver "${toReceiver}"`;
    }
}
class MessageReceiverAlreadyExist implements ErrorType {
    message: string;
    receiverName: string;

    constructor(receiverName: string) {
        this.receiverName = receiverName;
        this.message = `Can't add receiver with name: "${receiverName}" because it's already exist`;
    }
}
class UnexpectedChromeRuntimeError implements ErrorType {
    message: string;

    constructor(message: string) {
        this.message = message;
    }
}

// Makes messaging between frontend page and background script
export namespace MessageUtil {
    const [messageReceivers, setMessageReceivers] = createSignal<Receiver[]>([]);

    export function _InitForBackground() {
        chrome.runtime.onMessage.addListener(OnNewChromeMessage);
    }

    function OnNewChromeMessage(message: MessageType, _, sendResponse: (response: Result<any, ErrorType>) => void | Promise<void>): void | true {
        var messageReceiver = messageReceivers().find(r => r["name"] === message.toReceiver);
        if (messageReceiver === undefined) {
            sendResponse(Result.Err(new MessageReceiverNotExist(message.toReceiver)));
        }
        else {
            console.debug(`${message.toReceiver}; ${message.messageName}; isAsync: ${message.isAsync}`);
            if (message.isAsync) {
                // If function is async with need to wait for its result first
                messageReceiver.onMessageReceived(message).then((response) => {
                    sendResponse(Result.Ok(response));
                });
                // returning true indicates to chrome messaging that there is an async function
                return true;
            } else {
                sendResponse(Result.Ok(messageReceiver.onMessageReceived(message)));
            }
        }

    }

    export function AddReceiver(receiverName: string, onMessageCallback: (message: MessageType) => any): Maybe<MessageReceiverAlreadyExist> {
        // Check if receiver with given name already exists
        // Note: It might be useful to add multiple callbacks to single receivers, but in my case it's not...
        if (messageReceivers().find(r => r["name"] === receiverName) !== undefined) {
            return Maybe.Err(new MessageReceiverAlreadyExist(receiverName));
        }

        setMessageReceivers([...messageReceivers(), {
            name: receiverName, onMessageReceived: onMessageCallback
        }]);
        return Maybe.Ok();
    }
}

// Sends given message to the background page. T is expected response type (void by default)
export async function SendChromeMessage<T = void>(message: MessageType): Promise<Result<T, UnexpectedChromeRuntimeError | MessageReceiverNotExist>> {
    // Note: Sometimes near randomly an error appears "receiving end doesn't exist".
    // I'm not sure what was (is?) causing, so instead of immediately scaring user with an error message
    // code below will try again and only then report an error. Keep an eye on this thing!
    var tryAgain: boolean = true;
    while (true) {
        try {
            // Send chrome message
            const response: Result<T, MessageReceiverNotExist> = await chrome.runtime.sendMessage(message);
            // Check for errors from chrome and messaging system
            if (chrome.runtime.lastError !== undefined) {
                return Result.Err(new UnexpectedChromeRuntimeError(`Try again! Chrome error: "${chrome.runtime.lastError.message}"`));
            }
            if (!response.isOk) {
                return Result.Err(response.error);
            }

            return Result.Ok(response.value);
        } catch (e) {
            // Try again before throwing an error
            if (tryAgain) {
                console.debug(`Error occurred in messaging system: "${e}"`);
                console.debug("Trying again");
                tryAgain = false;
                continue;
            }
            return Result.Err(new UnexpectedChromeRuntimeError(`Messaging system try catch block: "${e}"`));
        }
    }
}
