import TabooManager from "./Managers/taboo-manager";
import ExcludedTabsManager from "./Managers/excluded-tabs-manager";
import {ChromeMessageContainer} from "./common-structures";


await startUpInit();


async function startUpInit() {
    await ExcludedTabsManager.Init();
    await TabooManager.Init( (tabooWebsites) => {
        ExcludedTabsManager.UpdateExcludedTabsWithTaboos(tabooWebsites)
    });

    // region Chrome event handlers
    chrome.runtime.onMessage.addListener(onNewChromeMessage);
    chrome.tabs.onRemoved.addListener(onTabRemoved);
    chrome.tabs.onUpdated.addListener(onTabUpdated);
    // endregion
}

function onNewChromeMessage(message: ChromeMessageContainer, sender: chrome.runtime.MessageSender,
                            sendResponse: (response?: any) => void) {
    if (message.command === "addTaboo") {
        sendResponse(TabooManager.Add(message.args[0]));
    }
    else if (message.command === "removeTaboo") {
        TabooManager.Remove(message.args[0]);
        sendResponse(true);
    }
}

function onTabRemoved(tabId: number, _: chrome.tabs.TabRemoveInfo): void {
    let excludedTabs = ExcludedTabsManager.Get();
    // Remove tab if it is closed and was excluded "one way"
    if (excludedTabs[tabId] && !excludedTabs[tabId].isForever) {
        ExcludedTabsManager.Remove(tabId);
    }
}


function onTabUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab): void {
    if (changeInfo.status === "complete" && TabooManager.IsTaboo(tab)) {
        chrome.tabs.create({
            url: chrome.runtime.getURL("./TabooPage/taboo.html"),
            active: true
        });
        chrome.tabs.remove(tab.id);
    }
}