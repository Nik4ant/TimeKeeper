import { Accessor, Setter } from "solid-js";

import { ValidationResult } from "../common-structures";
import { createStorageSignalAsync } from "../storage";


// Note: This doesn't look like the best way to use class...
export default class TabooManager {
    static _tabooWebsitesGetter: Accessor<string[]>;
    static _tabooWebsitesSetter: Setter<string[]>;

    static async Init(): Promise<void> {
        [this._tabooWebsitesGetter, this._tabooWebsitesSetter] = await createStorageSignalAsync<string[]>("tabooWebsites", []);
    }

    static ValidateTaboo(tabooDomain): ValidationResult {
        const minTabooLength = 4;
        const maxTabooLength = 30;
        if (tabooDomain.length === 0) {
            return new ValidationResult(false, "Taboo domain is <span class='font-bold'>empty</span>");
        }
        if (tabooDomain.length < minTabooLength) {
            return new ValidationResult(false, `Taboo domain is <span class='font-bold'>too short (${tabooDomain.length} < ${minTabooLength})</span>`);
        }
        if (tabooDomain.length > maxTabooLength) {
            return new ValidationResult(false, `Taboo domain is <span class='font-bold'>too long (${tabooDomain.length} > ${maxTabooLength})</span>`);
        }
        if (TabooManager._tabooWebsitesGetter().indexOf(tabooDomain) !== -1) {
            return new ValidationResult(false, "Taboo domain <span class='font-bold'>already exists</span>");
        }
        return new ValidationResult(true);
    }

    static IsTaboo(tab: chrome.tabs.Tab): boolean {
        for (const tabooDomain of this._tabooWebsitesGetter()) {
            if (tab.url.indexOf(tabooDomain) !== -1) {
                return true;
            }
        }
        return false;
    }

    static Get(): string[] {
        return this._tabooWebsitesGetter();
    }

    static Add(newTabooDomain: string): ValidationResult {
        const validationResult = this.ValidateTaboo(newTabooDomain);
        if (validationResult.isOk) {
            this._tabooWebsitesSetter([...this._tabooWebsitesGetter(), newTabooDomain]);
        }

        return validationResult;
    }

    static Remove(tabooDomain: string): void {
        const currentTaboos = this._tabooWebsitesGetter();
        const index = currentTaboos.indexOf(tabooDomain);

        if (index !== -1) {
            currentTaboos.splice(index, 1);
            this._tabooWebsitesSetter(currentTaboos);
        }
    }
}