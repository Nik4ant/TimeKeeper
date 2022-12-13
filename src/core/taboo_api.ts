import {ErrorType, Maybe} from "../utils/custom_error"
import {createStorageSignalAsync} from "../utils/storage_manager"

export const TABOO_STORAGE_NAME = "TimeKeeperTabooWebsites";
let [tabooWebsitesGetter, tabooWebsiteSetter] = await createStorageSignalAsync<string[]>(TABOO_STORAGE_NAME, []);

export const MIN_TABOO_LENGTH = 4;
export const MAX_TABOO_LENGTH = 30;


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


export namespace TabooApi {
    export function Add(tabooDomain: string): Maybe<TabooValidationError> {
        if (tabooDomain.length === 0) {
            return Maybe.Err(new TabooValidationError(`Taboo domain is empty`, "Empty"));
        }
        if (tabooDomain.length < MIN_TABOO_LENGTH) {
            return Maybe.Err(new TabooValidationError(`Taboo domain is too short (${tabooDomain.length} < ${MIN_TABOO_LENGTH})`, "TooShort"));
        }
        if (tabooDomain.length > MAX_TABOO_LENGTH) {
            return Maybe.Err(new TabooValidationError(`${tabooDomain.length} is too long (${tabooDomain.length} > ${MAX_TABOO_LENGTH})`, "TooLong"));
        }
        if (tabooWebsitesGetter().indexOf(tabooDomain) !== -1) {
            return Maybe.Err(new TabooValidationError(`${tabooDomain} already exists`, "AlreadyExist"));
        }

        tabooWebsiteSetter([...tabooWebsitesGetter(), tabooDomain]);
        return Maybe.Ok();
    }

    export function Remove(tabooDomain: string): Maybe<TabooNotExist> {
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

    export function IsTaboo(website: string): boolean {
        for (const tabooDomain of tabooWebsitesGetter()) {
            if (website.indexOf(tabooDomain) !== -1) {
                return true;
            }
        }
        return false;
    }
}