import {Pomodoro} from "./core/pomodoro_api";
import {MessageUtil} from "./utils/message_api";
import {Taboo} from "./core/taboo_api";


chrome.tabs.onUpdated.addListener(  (tabId, changeInfo, _) => {
    // Check if new url (if any) is taboo (tab is blocked only during work session)
    if (changeInfo.url !== undefined && Pomodoro.Api._IsWorkingSession() && Taboo.Api.IsTaboo(changeInfo.url)) {
        // Try to go back to prevent opening of taboo website
        chrome.tabs.goBack(tabId)
            .catch(() => {
                // Sometimes there is no go back option. In this case close the taboo tab
                chrome.tabs.remove(tabId);
            });
    }
});
// region APIs setup
MessageUtil._InitForBackground();
Pomodoro.Api._InitForBackground();
Taboo.Api._InitForBackground();
// endregion