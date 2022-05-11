document.addEventListener("DOMContentLoaded", (_) => {
    let tabooInputElement = document.getElementById("tabooInput");
    // If enter is pressed then new taboo domain added
    tabooInputElement.addEventListener("keydown", tabooInputKeyDown);

    let tabooButtonElement = document.getElementById("addTabooButton");
    // On add button click new taboo domain added
    tabooButtonElement.addEventListener("click", async() => {
        await onNewTabooAdded(tabooInputElement.value);
    });
});

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