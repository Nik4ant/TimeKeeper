import { TabooApi } from "./core/taboo_api"


function onTabUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) {
    if (changeInfo.status == "loading") {
        console.log(tab.url, tabId, tab.id);
    }
}

chrome.tabs.onUpdated.addListener(onTabUpdated);
