import {RiSystemDeleteBin2Line} from "solid-icons/ri";
import {For} from "solid-js/web";
import {createSignal} from "solid-js";

import {ValidationResult, ChromeMessageContainer} from "../../common-structures";
import {connectToStorageSignal} from "../../storage";


function TabooWebsite(props) {
    function removeTaboo(taboo) {
        // Sending message to extension background script
        const removeTabooMessage = new ChromeMessageContainer("removeTaboo", [taboo]);
        chrome.runtime.sendMessage(removeTabooMessage);
    }

    const tabooWebsite = (<p class="flex-1 font-medium text-base text-base-content decoration-error decoration-4">{props.website}</p> as HTMLParagraphElement);
    const deleteIcon = (<RiSystemDeleteBin2Line size={24} class={"text-error"}
                                                onClick={_ => removeTaboo(props.website)} /> as HTMLOrSVGImageElement);
    // Special hover effect...
    deleteIcon.addEventListener("mouseover", (_) => {
        tabooWebsite.classList.add("line-through")
    });
    deleteIcon.addEventListener("mouseout", (_) => {
        tabooWebsite.classList.remove("line-through")
    });
    return (
        <>
            <div class="flex space-x-2 items-center m-2 p-2.5 bg-base-300 border border-accent-focus rounded-md">
                {tabooWebsite}
                {deleteIcon}
            </div>
        </>
    );
}

function TabooInput() {
    function addTaboo(taboo: string): void {
        const formattedTaboo = taboo.replace(/\s+/g, '');
        // Sending message to extension background script
        const addTabooMessage = new ChromeMessageContainer("addTaboo", [formattedTaboo]);
        chrome.runtime.sendMessage(addTabooMessage, (result: ValidationResult) => {
            // FIXME: the whole design implementation sucks so much...
            if (!result.isOk) {
                errorMessage.innerHTML = result.htmlErrorMessage;
                // Different outline color for input on error
                tabooInput.classList.add("border-error");
                tabooInput.classList.remove("focus:border-primary-focus");
            }
            else {
                errorMessage.innerHTML = "";
                tabooInput.value = "";
                tabooInput.classList.remove("border-error");
                tabooInput.classList.add("focus:border-primary-focus");
            }
        });
    }

    const errorMessage = (<p class="mt-2 text-sm text-error" /> as HTMLParagraphElement);

    const tabooInput = (<input type="text" name="tabooInput" class="input bg-base-300 border-base-content text-base-content border-2 border-l-4 rounded-l-none flex-1 p-1.5 text-lg focus:outline-none focus:border-primary-focus" /> as HTMLInputElement);
    tabooInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
            addTaboo(tabooInput.value);
        }
    });
    return (
        <>
            <div class="flex flex-col space-y-1 items-center">
                <label for="tabooInput" class="p-1.5 text-lg text-base-content font-medium">Add taboo domain:</label>
                <div class="flex">
                    <span class="inline-flex items-center px-3 text-base text-base-content bg-base-300 border-2 border-r-0 border-base-content rounded-l-md">
                    https://
                    </span>
                    {tabooInput}
                    <button onClick={_ => addTaboo(tabooInput.value)} class="btn btn-primary items-center justify-center mx-2 rounded-box">Add</button>
                </div>
                {errorMessage}
            </div>
        </>
    );
}

export default function TabooTabContent() {
    // Signal to taboo websites in storage
    let [tabooGetter, tabooSetter] = createSignal<string[]>([]);
    connectToStorageSignal<string[]>("tabooWebsites").then((storageGetter) => {
        tabooGetter = storageGetter;
        tabooSetter(storageGetter());
    });

    return (
        <>
            <TabooInput />
            <div class="p-2 flex justify-center">
                <div>
                    <h1 class="text-xl font-semibold text-center text-base-content">Taboo domains</h1>
                    <div class="p-2 flex flex-col">
                        <For each={tabooGetter()}>
                            {(tabooWebsite, _) => <TabooWebsite website={tabooWebsite}/>}
                        </For>
                    </div>
                </div>
            </div>
        </>
    );
}