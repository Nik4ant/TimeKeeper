import {Pomodoro} from "./core/pomodoro_api";
import {MessageUtil} from "./utils/message_api";
import {Taboo} from "./core/taboo_api";


chrome.webNavigation.onCompleted.addListener( (details) => {
    // Note: Websites can load some content from taboo pages. To prevent false positive, check frameType
    // to see if this is an actual website or a resource fetched from other website
    // @ts-ignore (ts wrongly assumes that frameType doesn't exist)
    if (Taboo.Api.IsTaboo(details.url) && details.frameType === "outermost_frame") {
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