import {PomodoroApi} from "./core/pomodoro_api";
import {MessageUtil} from "./utils/message_api";
import {Taboo} from "./core/taboo_api";


// That's pretty much it. TODO: work session thingy and combine that with tabs exclusion
// TODO: Doesn't work properly for websites that contain taboo content. For example: https://v2.tailwindcss.com/docs/just-in-time-mode
//  Figure out a way to go back only if either main url is taboo or taboo content is loaded afterwards

chrome.webNavigation.onCompleted.addListener((details) => {
    // TODO 2: details object must contain frameType and other field: https://developer.chrome.com/docs/extensions/reference/webNavigation/#event-onCompleted
    //  yet typescript thinks that they don't exist. [TYPE HINT OR SMTH!]
    if (Taboo.Api.IsTaboo(details.url)) {
        console.log(details);  // debug only
        // FIXME: Doesn't work if there is no goBack option (close the tab in that case)
        // [UPD: no there is] This is dumb, but there is no other way to  100% get frame type
        chrome.webNavigation.getFrame({frameId: details.frameId, tabId: details.tabId}).then();
        chrome.tabs.goBack(details.tabId);
    }
});
// TODO: idea - generate error messages for errors inside constructors! (whenever it makes sense)
// region Pomodoro Api
MessageUtil._InitForBackground();
PomodoroApi._InitForBackground();
Taboo.Api._InitForBackground();
// endregion