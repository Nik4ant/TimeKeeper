import {ErrorType, Maybe} from "../utils/custom_error"
import {createStorageSignalAsync} from "../utils/storage_manager"

const EXCLUDE_STORAGE_NAME = "TimeKeeperExcludeTabs";
let [excludedTabsGetter, excludedTabsSetter] = await createStorageSignalAsync<Number[]>(EXCLUDE_STORAGE_NAME, []);


class ExcludedTabNotExist implements ErrorType {
    message: string

    constructor(message: string) {
        this.message = message
    }
}


export namespace ExcludeApi {
    export function get(): Number[] {
        return excludedTabsGetter();
    }

    export function add(tabId: number): void {
        let result = excludedTabsGetter();
        result.push(tabId);
        excludedTabsSetter(result);
    }

    export function remove(tabId: Number): Maybe<ExcludedTabNotExist> {
        let result = excludedTabsGetter();
        const index = result.indexOf(tabId);
        if (index !== -1) {
            result.splice(index, 1);
            excludedTabsSetter(result);
            return Maybe.Ok();
        }
        return Maybe.Err(new ExcludedTabNotExist(`Tab with id "${tabId}" doesn't exist`));
    }
}