let tabooTemplate;


document.addEventListener("DOMContentLoaded", (_) => {
    // Template for taboo websites
    tabooTemplate = document.getElementById("tabooWebsiteTemplate").content;
    chrome.storage.sync.get("tabooWebsites").then((result) => {
        if (result.tabooWebsites) {
            extendTabooList(result.tabooWebsites);
        }
    });

    let tabooInputElement = document.getElementById("tabooInput");
    // If enter is pressed then new taboo domain added
    tabooInputElement.addEventListener("keydown", tabooInputKeyDown);

    let tabooButtonElement = document.getElementById("addTabooButton");
    // On add button click new taboo domain added
    tabooButtonElement.addEventListener("click", () => {
        onNewTabooAdded(tabooInputElement.value);
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
        tabLink.addEventListener("click", (_) => {
            setActiveTab(currentTabNum, tabsDict);
        });
    }
});

function extendTabooList(tabooWebsites) {
    const tabooContainer = document.getElementById("tabooWebsitesContainer");

    for (const website of tabooWebsites) {
        // Creating item
        const tabooItem = document.importNode(tabooTemplate, true);
        let websiteElement = tabooItem.querySelector("[tabooDomain]");
        let deleteIconElement = tabooItem.querySelector("[deleteIcon]");
        websiteElement.textContent = website;
        deleteIconElement.addEventListener("mouseover", (_) => {
            websiteElement.classList.add("line-through");
        });
        deleteIconElement.addEventListener("mouseout", (_) => {
            websiteElement.classList.remove("line-through");
        });
        deleteIconElement.addEventListener("click", async(_) => {
            await onTabooDeleted(website);
        });

        tabooContainer.appendChild(tabooItem);
    }
}

function removeTabooFromList(tabooWebsite) {
    const tabooContainer = document.getElementById("tabooWebsitesContainer");
    // Looping through all taboo items to find item to delete
    for (const tabooItem of tabooContainer.children) {
        let currentWebsite = tabooItem.querySelector("[tabooDomain]").textContent;
        if (currentWebsite === tabooWebsite) {
            tabooContainer.removeChild(tabooItem);
            return;
        }
    }
}

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

function tabooInputKeyDown(event) {
    if (event.key === "Enter") {
        onNewTabooAdded(event.target.value);
    }
}

function onNewTabooAdded(tabooDomain) {
    let inputErrorElement = document.getElementById("inputErrorText");
    // Validation
    if (tabooDomain.length < 4) {
        inputErrorElement.innerHTML = `Taboo domain is <span class="font-bold">too short</span>`;
        inputErrorElement.classList.remove("hidden");
        return;
    }
    // Sending message to background.js
    chrome.runtime.sendMessage({"event": "onNewTabooAdded", "data": [tabooDomain]}).then((response) => {
        // true if domain doesn't exist already
        if (response) {
            extendTabooList([tabooDomain]);
            inputErrorElement.classList.add("hidden");
        }
        else {
            inputErrorElement.innerHTML = `Similar taboo domain <span class="font-bold">already exists</span>`;
            inputErrorElement.classList.remove("hidden");
        }
    });
}

function onTabooDeleted(deletedTaboo) {
    chrome.runtime.sendMessage({"event": "onTabooDeleted", "data": [deletedTaboo]}).then((_) => {
        removeTabooFromList(deletedTaboo);
    });
}
