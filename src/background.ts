import {Pomodoro} from "./core/pomodoro_api";
import {MessageUtil} from "./utils/message_api";
import {Taboo} from "./core/taboo_api";


chrome.webNavigation.onCompleted.addListener( (details) => {
    if (Taboo.Api.IsTaboo(details.url)) {
        // TODO MAIN: frame stuff is still needed to check only for final page and not extra content
        console.log(details);  // debug only

        // Try to go back
        chrome.tabs.goBack(details.tabId)
            .catch(() => {
                // Sometimes there is no go back option. In this case close the taboo tab
                chrome.tabs.remove(details.tabId);
            });
    }
});
// region APIs setup
MessageUtil._InitForBackground();
Pomodoro.Api._InitForBackground();
Taboo.Api._InitForBackground();
// endregion