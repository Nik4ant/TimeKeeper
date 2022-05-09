chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message["tab"]) {
        return;
    }
    let tabooWebsiteUrl = message["tabooWebsiteUrl"];
    // Add favicon of taboo website
    let imgTag = document.querySelector("[insertTabooFavicon]");
    imgTag.setAttribute("src", `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${tabooWebsiteUrl}&size=128`);
    // TODO: maybe support for one random fact about procrastination:
    //  https://solvingprocrastination.com/procrastination-facts/
    // Filling text with taboo url
    let aTags = document.querySelectorAll("[insertTabooLink]");
    for (const aTag of aTags) {
        aTag.setAttribute("href", tabooWebsiteUrl);
    }

    sendResponse(true);
});

window.addEventListener('load', function () {
    // Allowing to open taboo tab in "one way"
    document.getElementById("temporaryAllowLink").addEventListener("click", async (event) => {
        chrome.runtime.sendMessage({"excludeNextTab": true});
    });
    // Allowing to press buttons only after some time has passed
    const timeForCloseButtonSec = 10;
    let currentCloseButton = 0;
    const timeForAllowButtonSec = 15;
    let currentAllowButton = 0;
    // Close button
    let closeButtonTimer = setInterval(() => {
        currentCloseButton += 1;
        if (currentCloseButton === timeForCloseButtonSec) {
            // TODO: change style
            clearInterval(closeButtonTimer);
        }
    }, 1000);
    // Allow button
    let allowButtonTimer = setInterval(() => {
        currentAllowButton += 1;
        if (currentAllowButton === timeForAllowButtonSec) {
            // TODO: change style
            clearInterval(allowButtonTimer);
        }
    }, 1000);

    document.getElementById("closeButton").addEventListener("click", async (event) => {
        self.close();
    });
})
