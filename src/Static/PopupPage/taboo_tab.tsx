import { RiSystemDeleteBin2Line } from "solid-icons/ri";
import { For } from "solid-js/web";
import { createSignal, Accessor } from "solid-js";

import { ValidationResult, CommandMessage } from "../../common-structures";
import { connectToStorageSignal } from "../../storage";
import { ExcludedTabInfo } from "../../Managers/excluded-tabs-manager";


function ExcludedTab(props) {
    function deleteExcludedTab(tabId) {

    }

    const excludedTab = (<p class="flex-1 font-medium text-base text-gray-800 decoration-pink-500 decoration-[3]">{props.tabId}</p> as HTMLParagraphElement);
    const isForeverCheckbox = (<input class="form-check-input appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer" type="checkbox" value="" /> as HTMLInputElement);
    isForeverCheckbox.checked = props.isForever;
    const deleteIcon = (<RiSystemDeleteBin2Line size={24} class={"text-red-500 hover:text-red-700"}
                                                onClick={_ => deleteExcludedTab(props.tabId)} /> as HTMLOrSVGImageElement);
    // Special hover effect...
    deleteIcon.addEventListener("mouseover", (_) => {
        excludedTab.classList.add("line-through")
    });
    deleteIcon.addEventListener("mouseout", (_) => {
        excludedTab.classList.remove("line-through")
    });
    return (
        <>
            <div class="flex space-x-2 items-center m-2 p-2.5 bg-white border border-gray-200 rounded-md">
                {excludedTab}
                {isForeverCheckbox}
                {deleteIcon}
            </div>
        </>
    );
}

function TabooWebsite(props) {
    function removeTaboo(taboo) {
        // Sending message to extension background script
        const removeCommand = new CommandMessage("removeTaboo", [taboo]);
        chrome.runtime.sendMessage(removeCommand);
    }

    const tabooWebsite = (<p class="flex-1 font-medium text-base text-gray-800 decoration-pink-500 decoration-[3]">{props.website}</p> as HTMLParagraphElement);
    const deleteIcon = (<RiSystemDeleteBin2Line size={24} class={"text-red-500 hover:text-red-700"}
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
            <div class="flex space-x-2 items-center m-2 p-2.5 bg-white border border-gray-200 rounded-md">
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
        const addCommand = new CommandMessage("addTaboo", [formattedTaboo]);
        chrome.runtime.sendMessage(addCommand, (result: ValidationResult) => {
            if (!result.isOk) {
                errorMessage.innerHTML = result.htmlErrorMessage;
            }
            else {
                errorMessage.innerHTML = "";
                tabooInput.value = "";
            }
        });
    }

    // TODO: make error message separate component (as a popup that can be closed)
    const errorMessage = (<p class="mt-2 text-sm text-red-600" /> as HTMLParagraphElement);
    const tabooInput = (<input type="text" name="tabooInput" class="flex-1 p-2.5 text-lg rounded-none rounded-r-lg border bg-gray-50 text-gray-900 border-gray-300 focus:outline-none focus:ring-violet-500 focus:border-violet-500" /> as HTMLInputElement);
    tabooInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
            addTaboo(tabooInput.value);
        }
    });
    return (
        <>
            <div class="flex flex-col space-y-1 items-center">
                <label for="tabooInput" class="p-1.5 text-base font-medium text-gray-900">Add taboo domain:</label>
                <div class="flex">
                    <span class="inline-flex items-center px-3 text-base text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md">
                    https://
                    </span>
                    {tabooInput}
                    <button onClick={_ => addTaboo(tabooInput.value)} class="items-center justify-center mx-2 p-0.5 mr-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800">
                        <span class="relative px-5 py-3.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">
                        Add
                        </span>
                    </button>
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
    // Signal to excluded tabs in storage
    let [excludedGetter, excludedSetter] = createSignal<{[tabId: number]: ExcludedTabInfo}>({});
    connectToStorageSignal<{[tabId: number]: ExcludedTabInfo}>("excludedTabs").then((storageGetter) => {
        excludedGetter = storageGetter;
        excludedSetter(storageGetter());
    });

    return (
        <>
            <TabooInput />
            <div class="p-2 flex justify-between">
                <div>
                    <h1 class="text-xl font-semibold text-center">Taboo domains</h1>
                    <div class="p-2">
                        <For each={tabooGetter()}>
                            {(tabooWebsite, _) => <TabooWebsite website={tabooWebsite}/>}
                        </For>
                    </div>
                </div>
                <div>
                    <h1 class="text-xl font-semibold text-center">Excluded tabs</h1>
                    <div class="p-2">
                        <For each={Object.entries(excludedGetter())}>
                            {([tabId, excludedInfo], _) => <ExcludedTab tabId={tabId} isForever={excludedInfo.isForever}/>}
                        </For>
                    </div>
                </div>
            </div>
        </>
    );
}