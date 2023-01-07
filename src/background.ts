import {PomodoroApi} from "./core/pomodoro_api";
import {MessageUtil} from "./utils/message_api";
import {Taboo} from "./core/taboo_api";


// That's pretty much it. TODO: work session thingy and combine that with tabs exclusion
chrome.webNavigation.onCompleted.addListener(async (details) => {
    if (Taboo.Api.IsTaboo(details.url)) {
        // TODO MAIN: frame stuff is still needed to check only for final page and not extra content
        console.log(details);  // debug only

        // Try to go back
        await chrome.tabs.goBack(details.tabId);
        // Sometimes there is no go back option.
        // In this case tab url won't change and the only option left is to close it
        const tab = await chrome.tabs.get(details.tabId);
        if (tab.url === details.url) {
            await chrome.tabs.remove(tab.id);
        }

    }
});
// region APIs setup
MessageUtil._InitForBackground();
PomodoroApi._InitForBackground();
Taboo.Api._InitForBackground();
// endregion