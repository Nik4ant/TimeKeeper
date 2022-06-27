import {For} from "solid-js/web";
import {createSignal} from "solid-js";

import {ValidationResult, ChromeMessageContainer} from "../../common-structures";
import { createStorageSignal } from "../../storage";


export default function ThemesTabContent() {
    // TODO: better comments + explanation
    function updateTheme(sender, theme: string) {
        // If event target was set to true changing theme
        if (sender.checked) {
            // Unchecking all checkboxes before setting theme
            const themesElements = document.getElementById("themesContainer").children;
            for (const themeElement of themesElements) {
                themeElement: HTMLDivElement;
                let currentCheckbox = themeElement.getElementsByTagName("input")[0];
                currentCheckbox.checked = false;
            }
            // Updating signal
            setCurrentTheme(theme);
            // Changing theme attribute
            document.getElementsByTagName("html")[0].setAttribute("data-theme", theme);
        }
        sender.checked = true;
    }

    const supportedThemes = ["light", "night", "forest", "darcula"]
    const [currentTheme, setCurrentTheme] = createStorageSignal<string>("UITheme", "forest");

    return (
        <>
            <div>
                <h1 class="text-center text-primary text-3xl">Available themes:</h1>
                <div id="themesContainer" class="p-2 flex flex-col items-center space-y-2.5">
                    <For each={supportedThemes}>{(theme, _) =>
                        <div class="flex justify-top space-x-2 cursor-pointer">
                            <span class="label-text font-base">{theme}</span>
                            <input onChange={event => updateTheme(event.target, theme)} checked={currentTheme() === theme} type="checkbox" class="checkbox checkbox-secondary" />
                        </div>
                    }</For>
                </div>
            </div>
        </>
    );
}