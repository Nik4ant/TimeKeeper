let tabooInputElement;
document.addEventListener("DOMContentLoaded", (_) => {
    tabooInputElement = document.getElementById("tabooInput");
    // If enter is pressed then new taboo domain added
    tabooInputElement.addEventListener("keydown", tabooInputKeyDown);
});
// TODO: on button click as well...

function tabooInputKeyDown(event) {
    if (event.key === "Enter") {
        onNewTabooAdded(tabooInputElement.value);
    }
}

function onNewTabooAdded(tabooDomain) {
    // TODO: figure out how can I ignore promises without errors
    chrome.runtime.sendMessage({"event": "onNewTabooAdded", "data": [tabooDomain]}).then((_) => _);
}