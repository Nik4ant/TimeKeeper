let tabooInputElement;
document.addEventListener("DOMContentLoaded", (_) => {
    tabooInputElement = document.getElementById("tabooInput");
    // If enter is pressed then new taboo domain added
    tabooInputElement.addEventListener("keydown", async(event) => { await tabooInputKeyDown(event); });
});
// TODO: on button click as well...

async function tabooInputKeyDown(event) {
    if (event.key === "Enter") {
        await onNewTabooAdded(tabooInputElement.value);
    }
}

async function onNewTabooAdded(tabooDomain) {
    // TODO: figure out how can I ignore promises without errors
    await chrome.runtime.sendMessage({"event": "onNewTabooAdded", "data": [tabooDomain]});
}