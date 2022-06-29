/** @jsxImportSource solid-js **/

// Without importing css, it doesn't load at all
import "../styles/taboo.css";
import {render, Show} from "solid-js/web";
import {createEffect, on, createSignal, Accessor} from "solid-js";
import {ChromeMessageContainer} from "../../common-structures";
import {connectToStorageSignalAsync} from "../../storage";


function SetTheme(theme: string) {
    document.getElementsByTagName("html")[0].setAttribute("data-theme", theme);
}

function TabooRoot(props) {
    function excludeTimerStep() {
        const newValue = currentExcludeTimerSec() - 1;
        if (newValue === -1) {
            clearInterval(excludeTimer);
            // Removing countdown timer
            const timerCountdownElement = document.getElementById("excludeCountdownTimer");
            timerCountdownElement.remove();
            // Changing text style
            const excludedButtonTextElement = document.getElementById("excludeButtonText");
            excludedButtonTextElement.classList.remove("opacity-50", "line-through");
            // Re-enabling default hover effect on button
            const excludeButtonElement = document.getElementById("excludeButton");
            excludeButtonElement.classList.remove("hover:bg-transparent");
            // Allowing user to exclude current tab
            excludeButtonElement.addEventListener("click", () => {
                chrome.tabs.getCurrent().then((tab) => {
                    const addExcludedTabMessage = new ChromeMessageContainer("addExcludedTab", [tab.id]);
                    // After tab was excluded changing its url to original url that triggered taboo page
                    chrome.runtime.sendMessage(addExcludedTabMessage, () => {
                        chrome.tabs.update(tab.id, {url: props.tabooWebsite});
                    });
                });
            });
        }
        else {
            currentExcludedTimerSecSetter(newValue);
        }
    }

    // Note: This code causes: "computations created outside a `createRoot` or `render` will never be disposed"
    // however I'm not sure if there is an actual memory leak.
    // Changing taboo page theme every time theme value in storage is changed
    connectToStorageSignalAsync<string>("UITheme").then((themeGetter: Accessor<string>) => {
        createEffect(on(themeGetter, (newTheme: string) => {
            SetTheme(newTheme);
        }));
    });
    // Timer before user is allowed to excluded current tab
    const excludedTimerStartSec = 3;
    const [currentExcludeTimerSec, currentExcludedTimerSecSetter] = createSignal<number>(excludedTimerStartSec);
    // TODO: reduce time only if user on this page?
    const excludeTimer = setInterval(excludeTimerStep, 1000);

    // Note: Down below exclude button has "hover:bg-transparent" class.
    // This is used to make default hover effect disabled until timer ends
    // FIXME: For some reason it can't render 3 digit number
    // TODO: Make light theme look better (it sucks in general, but this page looks awful with it)
    return (
        <>
            <div class="flex justify-center items-center h-screen bg-base-100">
                <div class="card bg-neutral text-neutral-content">
                    <div class="card-body items-center text-center space-y-3">
                        <h1 class="font-extrabold text-4xl secondary-text-gradient">Don't you dare procrastinate!!!</h1>
                        <div class="flex flex-row space-x-2.5">
                            <h2 class="card-title underline underline-offset-4 decoration-dashed decoration-primary-focus">
                                <span class="text-primary text-xl font-bold">At:</span>
                                {props.tabooWebsite}
                            </h2>
                            <Show when={props.tabooFaviconUrl !== undefined}>
                                <img src={props.tabooFaviconUrl} width="32" height="32" />
                            </Show>
                        </div>
                        <div class="card-actions justify-end">
                            <button onClick={_ => close()} class="btn btn-primary">Close</button>
                            <div>
                                <button id="excludeButton" class="btn btn-ghost hover:bg-transparent">
                                    <p id="excludeButtonText" class="text-center opacity-60 line-through">Exclude this tab</p>
                                </button>
                                <span id="excludeCountdownTimer" class="relative -left-1/2 align-middle countdown font-mono text-4xl">
                                    <span style={"--value:" + currentExcludeTimerSec() + ";"}></span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// Receiving data from background script before rendering
chrome.runtime.onMessage.addListener((message, sender) => {
    if (message["tabooWebsite"]) {
        // Not every website has favicon
        let favicon = undefined;
        if (message["tabooFaviconUrl"]) {
            favicon = message["tabooFaviconUrl"];
        }
        render(() => <TabooRoot tabooWebsite={message["tabooWebsite"]} tabooFaviconUrl={favicon} />,
            document.getElementById("root") as HTMLElement);
        // Loading initial theme from storage
        chrome.storage.sync.get("UITheme").then((storageCurrent) => {
            if (storageCurrent["UITheme"] !== undefined) {
                SetTheme(storageCurrent["UITheme"]);
            }
        });
    }
});