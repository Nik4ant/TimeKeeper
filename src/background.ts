import {TabooApi} from "./core/taboo_api"
import {PomodoroApi} from "./core/pomodoro_api";


// TODO dumb: Add ';' everywhere (and maybe make them required in a tsconfig or smth)
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
// TODO: I SHOULD REALLY LEARN HOW IMPORTING CODE TO FRONTEND WORKS AND I MIGHT NEED TO REPLACE EVERYTHING WITH MESSAGES
PomodoroApi._Init();
// endregion