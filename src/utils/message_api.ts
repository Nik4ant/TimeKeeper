import {createSignal} from "solid-js";
import {ErrorType, Maybe, Result} from "./custom_error";

// Base type for messages
export abstract class MessageType {
    toReceiver: string;
    // Indicates if message is designed to work with async function
    readonly isAsync: boolean = false;
    // Used to distinguish messages
    protected abstract readonly messageName: string;

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
        console.log("Adding receiver for: ", this.MESSAGE_RECEIVER_NAME);
        MessageUtil.AddReceiver(this.MESSAGE_RECEIVER_NAME, this.OnNewMessageReceived);
    }
}

// TODO: add support and handler for this error everywhere
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

// Makes messaging between frontend page and background script
export namespace MessageUtil {
    const [messageReceivers, setMessageReceivers] = createSignal<Receiver[]>([]);

    export function _InitForBackground() {
        chrome.runtime.onMessage.addListener(OnNewChromeMessage);
    }

    function OnNewChromeMessage(message: MessageType, sender, sendResponse): void | true {
        var messageReceiver = messageReceivers().find(r => r["name"] === message.toReceiver);
        if (messageReceiver === undefined) {
            sendResponse(Result.Err(new MessageReceiverNotExist(message.toReceiver)));
        }
        else {
            // returning true is required for chrome messaging to work with async
            if (message.isAsync) {
                return true;
            }
            sendResponse(Result.Ok(messageReceiver.onMessageReceived(message)));
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
