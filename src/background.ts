import TabooManager from "./Managers/taboo-manager";
import ExcludedTabsManager from "./Managers/excluded-tabs-manager";
import {ChromeMessageContainer} from "./common-structures";


// TODO: cleanup extension permissions before publishing
await startUpInit();


async function startUpInit() {
    await ExcludedTabsManager.Init();
    await TabooManager.Init();

    // region Chrome event handlers
    chrome.runtime.onMessage.addListener(onNewChromeMessage);
    chrome.tabs.onRemoved.addListener(onTabRemoved);
    chrome.tabs.onUpdated.addListener(onTabUpdated);
    chrome.windows.onRemoved.addListener(onBrowserWindowRemoved);
    // endregion
}

function onNewChromeMessage(message: ChromeMessageContainer, sender: chrome.runtime.MessageSender,
                            sendResponse: (response?: any) => void): void {
    if (message.command === "addTaboo") {
        sendResponse(TabooManager.Add(message.args[0]));
    }
    else if (message.command === "removeTaboo") {
        TabooManager.Remove(message.args[0]);
        sendResponse(true);
    }
    else if (message.command === "addExcludedTab") {
        ExcludedTabsManager.Add(message.args[0]);
        sendResponse(true);
    }
    else if (message.command === "removeExcludedTab") {
        ExcludedTabsManager.Remove(message.args[0]);
        sendResponse(true);
    }
}

function onBrowserWindowRemoved(_: number): void {
    // Clearing all excluded tabs if last window is closed (browser closed)
    chrome.windows.getAll().then((windows) => {
        if (windows.length === 1) {
            // FIXME: concept of excluding tabs doesn't work too well (either fix it somehow or redesign)
            ExcludedTabsManager.ClearAll();
        }
    });
}

function onTabRemoved(tabId: number, _: chrome.tabs.TabRemoveInfo): void {
    ExcludedTabsManager.Remove(tabId);
}

// FIXME: This doesn't detect taboo tabs after browser startup (only after taboo page was reloaded)
function onTabUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab): void {
    if (changeInfo.status === "complete" && TabooManager.IsTaboo(tab) && !ExcludedTabsManager.Contains(tab.id)) {
        openTabooPage(tab);
        chrome.tabs.remove(tab.id);
    }
}

function openTabooPage(tabooTab: chrome.tabs.Tab): void {
    let tabooUrl = tabooTab.url;
    let tabooFaviconUrl = tabooTab.favIconUrl;

    chrome.tabs.create({
        url: chrome.runtime.getURL("./TabooPage/taboo.html"),
        active: true
    }).then((tab: chrome.tabs.Tab) => {
        // Note: When callback is called it's not guaranteed that tab is loaded
        // and that's why "receiving end does not exist". To avoid this error message needs
        // to be sent after tab is loaded...
        chrome.tabs.onUpdated.addListener(function tempListener(_, changeInfo) {
            if (changeInfo.status === "complete") {
                chrome.tabs.onUpdated.removeListener(tempListener);
                // Sending url that triggered taboo page and its favicon
                chrome.tabs.sendMessage(tab.id, {"tabooWebsite": tabooUrl, "tabooFaviconUrl": tabooFaviconUrl});
            }
        });
    });
}