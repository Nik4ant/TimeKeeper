document.addEventListener("DOMContentLoaded", (_) => {
    let tabooInputElement = document.getElementById("tabooInput");
    // If enter is pressed then new taboo domain added
    tabooInputElement.addEventListener("keydown", tabooInputKeyDown);

    let tabooButtonElement = document.getElementById("addTabooButton");
    // On add button click new taboo domain added
    tabooButtonElement.addEventListener("click", async() => {
        await onNewTabooAdded(tabooInputElement.value);
    });
    // Tabs system
    let ulMenuElement = document.getElementById("tabsMenu");
    let tabsDict = {};
    let linksForTabs = ulMenuElement.querySelectorAll("[data-tab]").entries();
    for (const enumerableTabLink of linksForTabs) {
        let tabLink = enumerableTabLink[1];
        let currentTabNum = tabLink.getAttribute("data-tab");
        tabsDict[currentTabNum] = {
            "link": tabLink,
            "content": document.querySelector(`div[data-tab="${currentTabNum}"]`)
        };
        // Changing tabs on click
        tabLink.addEventListener("click", (event) => {
            setActiveTab(currentTabNum, tabsDict);
        });
    }

    // Showing menu with all taboo websites
    // TODO:
});

function setActiveTab(activatedTabNum, tabsDict) {
    // Deactivating everything and activating needed tab later
    for (const tabNum in tabsDict) {
        const tabLink = tabsDict[tabNum]["link"];
        const tabContent = tabsDict[tabNum]["content"];
        // Link
        tabLink.classList.replace("active-navbar-link", "disabled-navbar-link");
        // Icon
        tabLink.children[0].classList.replace("active-navbar-icon", "disabled-navbar-icon");
        // Content
        tabContent.classList.replace("active", "hidden");
    }
    const activatedTabLink = tabsDict[activatedTabNum]["link"];
    const activatedTabContent = tabsDict[activatedTabNum]["content"];
    // Link
    activatedTabLink.classList.replace("disabled-navbar-link", "active-navbar-link");
    // Icon
    activatedTabLink.children[0].classList.replace("disabled-navbar-icon", "active-navbar-icon");
    // Content
    activatedTabContent.classList.replace("hidden", "active");
}

async function tabooInputKeyDown(event) {
    if (event.key === "Enter") {
        await onNewTabooAdded(event.target.value);
    }
}

async function onNewTabooAdded(tabooDomain) {
    // Validating string
    if (tabooDomain) {
        await chrome.runtime.sendMessage({"event": "onNewTabooAdded", "data": [tabooDomain]});
    }
}