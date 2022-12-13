import { TabooApi } from "./core/taboo_api"


// That's pretty much it. TODO: work session thingy and combine that with tabs exclusion
chrome.webNavigation.onCompleted.addListener(details => {
    if (TabooApi.IsTaboo(details.url)) {
        chrome.tabs.goBack(details.tabId).then(value => console.log(value));
    }
});
