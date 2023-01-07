import {ErrorType, Maybe} from "../utils/custom_error"
import {createStorageSignalAsync} from "../utils/storage_manager"
import {MessageBasedApi, MessageType} from "../utils/message_api";

export const TABOO_STORAGE_NAME = "TimeKeeperTabooWebsites";
const [tabooWebsitesGetter, tabooWebsiteSetter] = await createStorageSignalAsync<string[]>(TABOO_STORAGE_NAME, []);


export namespace Taboo {
    // TODO: why min length is exported? Research it
    export const MIN_LENGTH = 4;
    export const MAX_LENGTH = 30;

    class TabooValidationError implements ErrorType {
        message: string
        status: "Empty" | "TooShort" | "TooLong" | "AlreadyExist"

        constructor(message: string, status: "Empty" | "TooShort" | "TooLong" | "AlreadyExist") {
            this.message = message;
            this.status = status;
        }
    }
    class TabooNotExist implements ErrorType {
        message: string

        constructor(message: string) {
            this.message = message
        }
    }

    // Types and containers for messaging system
    export namespace Message {
        export class Add implements MessageType {
            // Note: Again fighting with the fact the interface can't have static values
            static readonly NAME = "TabooMessageAdd";
            messageName: string;

            toReceiver: string;
            newTabooDomain: string;
            constructor(tabooDomain: string) {
                this.toReceiver = Api.MESSAGE_RECEIVER_NAME;
                this.newTabooDomain = tabooDomain;
                this.messageName = Add.NAME;
            }
        }
        export type AddResponse = Maybe<TabooValidationError>;

        export class Remove implements MessageType {
            // Note: Again fighting with the fact the interface can't have static values
            static readonly NAME;
            messageName: string;

            toReceiver: string;
            tabooDomain: string;
            constructor(tabooDomain: string) {
                this.toReceiver = Api.MESSAGE_RECEIVER_NAME;
                this.tabooDomain = tabooDomain;
                this.messageName = Remove.NAME;
            }
        }
        export type RemoveResponse = Maybe<TabooNotExist>;
    }
    // Api that handles new messages and contains actual api logic
    export class Api extends MessageBasedApi {
        public static override readonly MESSAGE_RECEIVER_NAME: string = "TabooApiReceiver";

        static override OnNewMessageReceived(message: Message.Add | Message.Remove): Message.AddResponse | Message.RemoveResponse {
            // Note: There is no better way to check message type (trust me, I've tried...)
            if (message.messageName === Message.Add.NAME) {
                return Api.Add((message as Message.Add).newTabooDomain);
            }
            else if (message.messageName === Message.Remove.NAME) {
                return Api.Remove((message as Message.Remove).tabooDomain);
            }
            else {
                console.error(`Unpredictable error! Unexpected message "${message}" to receiver "${Api.MESSAGE_RECEIVER_NAME}"`);
            }
        }

        private static Add(tabooDomain: string): Maybe<TabooValidationError> {
            if (tabooDomain.length === 0) {
                return Maybe.Err(new TabooValidationError(`Taboo domain is empty`, "Empty"));
            }
            if (tabooDomain.length < MIN_LENGTH) {
                return Maybe.Err(new TabooValidationError(`Taboo domain is too short (${tabooDomain.length} < ${MIN_LENGTH})`, "TooShort"));
            }
            if (tabooDomain.length > MAX_LENGTH) {
                return Maybe.Err(new TabooValidationError(`${tabooDomain.length} is too long (${tabooDomain.length} > ${MAX_LENGTH})`, "TooLong"));
            }
            if (tabooWebsitesGetter().indexOf(tabooDomain) !== -1) {
                return Maybe.Err(new TabooValidationError(`${tabooDomain} already exists`, "AlreadyExist"));
            }

            tabooWebsiteSetter([...tabooWebsitesGetter(), tabooDomain]);
            return Maybe.Ok();
        }

        private static Remove(tabooDomain: string): Maybe<TabooNotExist> {
            const currentTaboos = tabooWebsitesGetter();
            const index = currentTaboos.indexOf(tabooDomain);

            if (index !== -1) {
                currentTaboos.splice(index, 1);
                tabooWebsiteSetter(currentTaboos);
                return Maybe.Ok();
            } else {
                return Maybe.Err(new TabooNotExist(`Taboo domain "${tabooDomain}" doesn't exist`));
            }
        }

        static IsTaboo(website: string): boolean {
            for (const tabooDomain of tabooWebsitesGetter()) {
                if (website.indexOf(tabooDomain) !== -1) {
                    return true;
                }
            }
            return false;
        }
    }
}