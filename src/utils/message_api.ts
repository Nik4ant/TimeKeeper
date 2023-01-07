import {createSignal} from "solid-js";
import {ErrorType, Maybe} from "./custom_error";

// Base type for messages
export type MessageType = {
    toReceiver: string
    // Note: Used to distinguish messages
    readonly messageName: string
}
// Type for messages receiver
type Receiver = {
    name: string,
    onMessageReceived: (message: MessageType) => any;
}
// Base interface for background API that relies on messaging
// TODO: explanation + complains about static abstract
// Note: This is bullshit, but there is no clean solution at the moment
export class MessageBasedApi {
    // Unique name for message receiver associated with the API.
    // Note: Default value is set to undefined because child APIs MUST implement it
    protected static MESSAGE_RECEIVER_NAME: string = undefined;

    protected static OnNewMessageReceived(message: MessageType): any {
        // This is used to force child APIs overwrite this function (it must be)
        throw new Error(`OnNewMessage isn't implemented for "${message.toReceiver}", but must be!`);
    }

    static _InitForBackground() {
        // Check to make sure that value was overwritten (it must be)
        if (this.MESSAGE_RECEIVER_NAME === undefined) {
            // Otherwise extension can't continue working, so error time... :(
            throw new Error("Receiver name for an API isn't implemented, but must be!");
        }
        MessageUtil.AddReceiver(this.MESSAGE_RECEIVER_NAME, this.OnNewMessageReceived);
    }
}

// Makes messaging between frontend page and background script
export namespace MessageUtil {
    let [messageReceiversGetter, messageReceiversSetter] = createSignal<Receiver[]>([]);

    class MessageReceiverNotExist implements ErrorType {
        message: string;
        toReceiver: string;

        constructor(toReceiver: string) {
            this.toReceiver = toReceiver;
            this.message = `Can't send message to not existing receiver "${toReceiver}"`;
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

    export function _InitForBackground() {
        chrome.runtime.onMessage.addListener(OnNewChromeMessage);
    }

    function OnNewChromeMessage(message: MessageType, sender, sendResponse): void {
        var messageReceiver = messageReceiversGetter().find(r => r["name"] === message.toReceiver);
        if (messageReceiver === undefined) {
            sendResponse(new MessageReceiverNotExist(message.toReceiver));
        } else {
            sendResponse(messageReceiver.onMessageReceived(message));
        }

    }

    export function AddReceiver(receiverName: string, onMessageCallback: (message: MessageType) => any): Maybe<MessageReceiverAlreadyExist> {
        // Check if receiver with given name already exists
        // Todo: This might be useful for adding multiple callbacks to single receivers, so will see about that...
        if (messageReceiversGetter().find(r => r["name"] === receiverName) !== undefined) {
            return Maybe.Err(new MessageReceiverAlreadyExist(receiverName));
        }

        messageReceiversSetter([...messageReceiversGetter(), {
            name: receiverName, onMessageReceived: onMessageCallback
        }]);
        return Maybe.Ok();
    }
}