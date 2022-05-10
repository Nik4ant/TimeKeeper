let tabooWebsites = [];
// Tabs with taboo websites that excluded forever
let foreverExcludedTabsIds = [];
// Tabs with taboo websites that excluded only while tab is open
let oneWayExcludedTabsIds = [];
// Loading data from storage
chrome.storage.sync.get(["tabooWebsites", "foreverExcludedTabsIds", "oneWayExcludedTabsIds"],
    (result) => {
        if (result.tabooWebsites !== undefined) {
            tabooWebsites = result.tabooWebsites;
        }
        if (result.foreverExcludedTabsIds !== undefined) {
            foreverExcludedTabsIds = result.foreverExcludedTabsIds;
        }
        if (result.oneWayExcludedTabsIds !== undefined) {
            oneWayExcludedTabsIds = result.oneWayExcludedTabsIds;
        }
    });
// TODO: add with delay like last time? +
//  if this will not work for async use: (...) => { onTabUpdated(...); }
chrome.tabs.onUpdated.addListener(onTabUpdated);
chrome.tabs.onRemoved.addListener(onTabUpdated);
chrome.runtime.onMessage.addListener(oneNewChromeMessage);
// Event handlers for custom events
const customEventHandlers = {
    "onNewTabooAdded": [onNewTabooAdded],
}

function isTabooTab(tab) {
    if (foreverExcludedTabsIds.indexOf(tab.id) !== -1 ||
        oneWayExcludedTabsIds.indexOf(tab.id) !== -1) {
        return false;
    }

    for (const taboo of tabooWebsites) {
        if (tab.url.indexOf(taboo) !==- 1) {
            return true;
        }
    }
    return false;
}

// region Custom event handlers implementations
function onNewTabooAdded(tabooDomain) {
    if (tabooWebsites.indexOf(tabooDomain) !== -1) {
        return true;
    }

    tabooWebsites.push(tabooDomain);
    // All existing tabs are automatically excluded
    chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
            if (isTabooTab(tab)) {
                foreverExcludedTabsIds.push(tab.id);
            }
        }
    });
    // Updating storage values
    chrome.storage.sync.set({"tabooWebsites": tabooWebsites});
    chrome.storage.sync.set({"foreverExcludedTabsIds": foreverExcludedTabsIds});
    return true;
}
// endregion

// region Chrome event handlers implementations
function onTabRemoved(tabId, removedInfo) {
    let index = oneWayExcludedTabsIds.indexOf(tabId);
    if (index !== -1) {
        // TODO: test if splice works
        oneWayExcludedTabsIds.splice(index);
    }
}

function oneNewChromeMessage(request, sender, sendResponse) {
    // Check if event has been triggered
    let handlers = customEventHandlers[request["event"]]
    if (handlers) {
        // Calling all handlers with await (no matter if they are sync or async)
        for (let handler of handlers) {
            handler(...request["data"]);
        }
    }
    return true;
}

function onTabUpdated(tabId, changedInfo, tab) {
    // TODO: test (especially with loading tabs)
    // Note: For some reason chrome can update undefined tabs so...
    if (tab) {
        if (isTabooTab(tab)) {
            // FIXME: This thing is called 5 times for a single tab...
            onTabooWebsiteOpened(tab.url);
        }
    }
}
// endregion

function onTabooWebsiteOpened(websiteUrl) {
    console.log("NOPE! You are about to visit a taboo website");
    // TODO: open taboo page with all that stuff
}