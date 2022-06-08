import { Accessor, Setter } from "solid-js";

import { createStorageSignal } from "../storage";


// TODO: The whole thing with excluded tabs doesn't really work because tabs change their ids every new browser session.
//  So this feature needs to be either removed or reworked
export class ExcludedTabInfo {
    // If tab isn't excluded forever it will be excluded temporary
    isForever: boolean

    constructor(isForever: boolean) {
        this.isForever = isForever;
    }
}


// Note: This doesn't look like the best way to use class...
export default class ExcludedTabsManager {
    static _excludedTabsGetter: Accessor<{[tabId: number]: ExcludedTabInfo}>;
    static _excludedTabsSetter: Setter<{[tabId: number]: ExcludedTabInfo}>;

    static async Init(): Promise<void> {
        [this._excludedTabsGetter, this._excludedTabsSetter] = await createStorageSignal<{[tabId: number]: ExcludedTabInfo}>("excludedTabs", {});
    }

    static UpdateExcludedTabsWithTaboos(taboos: string[]): void {
        chrome.tabs.query({}).then((tabs) => {
            let result = this._excludedTabsGetter();
            // This is used to remove tab from excluded if it's no longer exist
            let noLongerExistingTabs = new Set(Object.keys(result));

            for (const tab of tabs) {
                // Tabs that will be left after loop, no longer exist
                // (toString is used because Object.keys() returns string[])
                noLongerExistingTabs.delete(tab.id.toString());

                let excludedTabInfo = result[tab.id];
                if (!excludedTabInfo) {
                    excludedTabInfo = new ExcludedTabInfo(false);
                }
                // Removing tab from excluded. If it's still taboo tab bring its info back otherwise it's gone
                delete result[tab.id];
                for (const taboo of taboos) {
                    if (tab.url.indexOf(taboo) !== -1) {
                        result[tab.id] = excludedTabInfo;
                        break;
                    }
                }
            }
            // Removing "dead" tabs
            for (const deadTabId of noLongerExistingTabs) {
                delete result[Number(deadTabId)];
            }
            this._excludedTabsSetter(result);
        });
    }

    static Get(): {[tabId: number]: ExcludedTabInfo} {
        return this._excludedTabsGetter();
    }

    static Add(tabId: number, info: ExcludedTabInfo): void {
        let result = this._excludedTabsGetter();
        result[tabId] = info;

        this._excludedTabsSetter(result);
    }

    static Remove(tabId): void {
        let result = this._excludedTabsGetter();
        delete result[tabId];

        this._excludedTabsSetter(result);
    }
}