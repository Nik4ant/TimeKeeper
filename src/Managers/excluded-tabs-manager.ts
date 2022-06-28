import { Accessor, Setter } from "solid-js";

import { createStorageSignalAsync } from "../storage";


// Note: This doesn't look like the best way to use class...
export default class ExcludedTabsManager {
    static _excludedTabsGetter: Accessor<Number[]>;
    static _excludedTabsSetter: Setter<Number[]>;

    static async Init(): Promise<void> {
        [this._excludedTabsGetter, this._excludedTabsSetter] = await createStorageSignalAsync<Number[]>("excludedTabs", []);
    }

    static Get(): Number[] {
        return this._excludedTabsGetter();
    }

    static Contains(tabId: number): boolean {
        return this._excludedTabsGetter().indexOf(tabId) !== -1;
    }

    // Note(Nik4ant): There is no validation because tabId isn't specified by user
    // (although having validation would be nice, but for now I don't really care :D)
    static Add(tabId: number): void {
        let result = this._excludedTabsGetter();
        result.push(tabId);
        this._excludedTabsSetter(result);
    }

    static ClearAll(): void {
        this._excludedTabsSetter([]);
    }

    static Remove(tabId: number): void {
        let result = this._excludedTabsGetter();
        const index = result.indexOf(tabId);
        if (index !== -1) {
            result.splice(index, 1);
            this._excludedTabsSetter(result);
        }
    }
}