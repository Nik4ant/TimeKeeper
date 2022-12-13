import {For} from "solid-js";
import {SetTheme, availableThemesGetter, currentThemeGetter} from "../../../../core/themes_manager";


function ThemeSwitcher() {
    function switchTheme(theme: string) {
        var result = SetTheme(theme);
        if (!result.isOk) {
            alert(`Unpredictable error. Contact the developer if possible. Thank you. Error message:\n${result.error.message}`);
        }
    }
    // Design is based on daisyUI theme switcher here: https://daisyui.com/docs/themes/
    return <>
        <div class="grid grid-cols-3 gap-4 p-4">
            <For each={availableThemesGetter()}>{(theme, i) =>
                <div class="border-base-content/20 hover:border-base-content/40 outline-base-content overflow-hidden
                rounded-lg border outline-2 outline-offset-2" data-set-theme={theme} data-act-class="outline"
                     classList={{"border-accent hover:border-accent": currentThemeGetter() === theme}}>
                    <div data-theme={theme} class="bg-base-100 text-base-content cursor-pointer">
                        <div class="grid grid-cols-5 grid-rows-3">
                            <div onClick={() => switchTheme(theme)} class="col-span-5 row-span-3 row-start-1 flex gap-1 py-3 px-4">
                                <div class="flex-grow text-sm font-bold">{theme}</div>
                                <div class="flex flex-shrink-0 flex-wrap gap-1">
                                    <div class="bg-primary w-2 rounded"></div>
                                    <div class="bg-secondary w-2 rounded"></div>
                                    <div class="bg-accent w-2 rounded"></div>
                                    <div class="bg-neutral w-2 rounded"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            }</For>
        </div>
    </>
}


export default function ThemesRoot() {
    return <>
        <ThemeSwitcher />
    </>
}