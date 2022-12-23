import {TabooApi} from "./core/taboo_api"
import {PomodoroApi} from "./core/pomodoro_api";


// That's pretty much it. TODO: work session thingy and combine that with tabs exclusion
// TODO: Doesn't work properly for websites that contain taboo content. For example: https://v2.tailwindcss.com/docs/just-in-time-mode
//  Figure out a way to go back only if either main url is taboo or taboo content is loaded afterwards

// FIXME: Doesn't work if there is no goBack option (close the tab in that case)
chrome.webNavigation.onCompleted.addListener(details => {
    if (TabooApi.IsTaboo(details.url)) {
        console.log(details);  // debug only
        chrome.tabs.goBack(details.tabId).then(value => console.log(value));
    }
});
// region Pomodoro Api
PomodoroApi._Init();
// Whenever window is closed pomodoro info needs to be updated (if any)
// (since there is no actual way to check if browser was closed)
chrome.windows.onRemoved.addListener(() => PomodoroApi.UpdateStorageInfo(true));
// endregion