function createTab(url) {
    return new Promise(resolve => {
        chrome.tabs.create({url}, async tab => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (info.status === 'complete' && tabId === tab.id) {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve(tab);
                }
            });
        });
    });
}


async function tabooListener(tabId, changeInfo, tab) {
    // Check if tab changed url
    if (changeInfo.url) {
        for (const tabooWebsite of tabooWebsites) {
            // Check if new tab is taboo website
            // TODO: For some reason it doesn't work half of the time
            if (changeInfo.url.indexOf(tabooWebsite) !== -1 && excludedTabsIds.indexOf(tabId) === -1) {
                // Sometimes taboo website needs to be accessed.
                // In this case current tab is added to excluded list
                if (excludeNextTabOneWay) {
                    excludeNextTabOneWay = false;
                    excludedTabsIds.push(tabId);
                    return;
                }
                // Closing current tab with taboo website
                await chrome.tabs.remove(tabId);
                // Open taboo page
                let tab = await createTab(chrome.runtime.getURL("Static/TabooPage/index.html"));
                chrome.tabs.sendMessage(tab.id, {"tabooWebsiteUrl": changeInfo.url, "tab": tab});
            }
        }
    }
}


let tabooWebsites = ["youtube.com", "vk.com", "surviv.io"];
// TODO: storage thingy
let excludedTabsIds = [];
// Tabs that will be excluded only in one way
let excludeNextTabOneWay = false;


chrome.tabs.onRemoved.addListener((tabId, _) => {
    let index = excludedTabsIds.indexOf(tabId);
    if (index !== 1) {
        excludedTabsIds.splice(index, 1);
    }
});
// After all previous tabs were loaded start listening for taboo tabs
setTimeout(() => {
    // Exclude existing tabs that were opened before
    chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
            excludedTabsIds.push(tab.id);
        }
    });
    // Note: Using onUpdated because url inside existing tab can change
    chrome.tabs.onUpdated.addListener(tabooListener);
}, 2500);

// Used for communication with static pages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message["excludeNextTab"] === true) {
        excludeNextTabOneWay = true
    }
    sendResponse(true);
});