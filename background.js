let tabooWebsites = [];
// Tabs with taboo websites that excluded forever
let foreverExcludedTabsIds = [];
// Tabs with taboo websites that excluded only while tab is open
let oneWayExcludedTabsIds = [];
// If true enables work -> relax -> work cycle (pomodoro technique)
let isPomodoroWorkingMode = false;
// Interval for work in pomodoro timer
let workTimerId = undefined;
// Timeout for break in pomodoro timer
let breakTimeoutId = undefined;
// Time interval between work and relax
let workTimeSeconds = 0;
let breakTimeSeconds = 0;
// If true custom sound will be used (not OS default one)
let useCustomSoundForNotifications = true;
// Event handlers for custom events
const customEventHandlers = {
    "onNewTabooAdded": [onNewTabooAdded],
    // TODO: maybe figure out better names for all that stuff with work/relax balance
    "onBreakTimeStart": [],
    "onBreakTimeEnd": []
}
// FIXME: Is there any reason why should I keep .then?
initOnStartup().then(_ => _);


async function initOnStartup() {
    // Loading data from storage

    // part 1
    // TODO: Support for pomodoro timer vars:
    // "isPomodoroWorkingMode", "workTimeSeconds", "breakTimeSeconds", "useCustomSoundForNotifications"
    // part 2
    // TODO: better solution for loading variables from storage (this one looks like shit)
    //  maybe smth like C# reflections, idk (don't forget about security since you can change any variable)
    tabooWebsites = await loadSyncStorageItem("tabooWebsites", []);
    foreverExcludedTabsIds = await loadSyncStorageItem("foreverExcludedTabsIds", []);
    oneWayExcludedTabsIds = await loadSyncStorageItem("oneWayExcludedTabsIds", []);
    // Event handlers for chrome "stuff"
    chrome.tabs.onUpdated.addListener(onTabUpdated);
    chrome.tabs.onRemoved.addListener(onTabUpdated);
    chrome.runtime.onMessage.addListener(oneNewChromeMessage);
    if (isPomodoroWorkingMode) {
        // Starting work session (pomodoro) and notifying user about it
        enableWorkSessionTimer();
        // TODO: separate function for notifying user
    }
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


async function loadSyncStorageItem(key, defaultValue) {
    return new Promise((resolve, _) => {
        chrome.storage.sync.get(key, resolve)
    }).then((result) => {
        if (result[key] === undefined) {
            chrome.storage.sync.set({key: defaultValue});
            return defaultValue;
        }
        return result[key];
    });
}


// region Custom event handlers implementations
function onNewTabooAdded(tabooDomain) {
    if (tabooWebsites.indexOf(tabooDomain) !== -1) {
        return;
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
}
// endregion


// region Chrome event handlers implementations
function onTabRemoved(tabId, removedInfo) {
    let index = oneWayExcludedTabsIds.indexOf(tabId);
    if (index !== -1) {
        oneWayExcludedTabsIds.splice(index);
    }
}


function oneNewChromeMessage(request, sender, sendResponse) {
    // Check if event has been triggered
    let handlers = customEventHandlers[request["event"]];
    if (handlers) {
        // Calling all handlers with await (no matter if they are sync or async)
        for (let handler of handlers) {
            handler(...request["data"]);
        }
    }
    // This function has to return something to message sender
    // (Otherwise there will be error with ignored promise)
    return true;
}


function onTabUpdated(tabId, changedInfo, tab) {
    // Note: For some reason chrome can update undefined tabs so...
    if (tab) {
        if (changedInfo.status === "complete" && isTabooTab(tab)) {
            onTabooWebsiteOpened(tab.url);
        }
    }
}
// endregion


// region Work session timer
function disableWorkSessionTimer() {
    clearInterval(workTimerId);
    clearTimeout(breakTimeoutId);
}


function enableWorkSessionTimer() {
    workTimerId = setInterval(() => {
        workSessionInterval();
    }, workTimeSeconds);
}


function workSessionInterval() {
    // Notifying that break started
    chrome.runtime.sendMessage({
        "event": "onBreakTimeStart",
        "data": [breakTimeSeconds]
    }).then((_) => _);
    // During break work interval is stopped
    clearInterval(workTimerId);

    // Starting break only after button was clicked
    // After break, it's started again
    breakTimeoutId = setTimeout(() => {
        workTimerId = setInterval(workSessionInterval, workTimeSeconds);
        chrome.runtime.sendMessage({
            "event": "onBreakTimeEnd",
            "data": [workTimeSeconds]
        }).then((_) => _);
    }, breakTimeSeconds);
}
// endregion

function onTabooWebsiteOpened(websiteUrl) {
    console.log("NOPE! You are about to visit a taboo website");
    // TODO: open taboo page with all that stuff
}