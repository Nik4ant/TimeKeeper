import {Maybe, ErrorType} from "../utils/custom_error";
import {createStorageSignalAsync} from "../utils/storage_manager";


class ThemeNotExist implements ErrorType {
    message: string

    constructor(message: string) {
        this.message = message;
    }
}


const DEFAULT_THEMES = ["night", "forest", "dark", "light", "cyberpunk"];
// Signal for list of available themes
const THEMES_STORAGE_NAME = "TimeKeeperThemes";
// TODO: ability to add custom themes
export let [availableThemesGetter, availableThemesSetter] = await createStorageSignalAsync<string[]>(THEMES_STORAGE_NAME, DEFAULT_THEMES);
CheckForNewThemes();

// Signal for current theme
const LATEST_THEME_STORAGE_NAME = "TimeKeeperLatestTheme";
let [currentThemeGetter, currentThemeSetter] = await createStorageSignalAsync<string>(LATEST_THEME_STORAGE_NAME, DEFAULT_THEMES[0]);
// Set theme on load
SetTheme(currentThemeGetter());
export {currentThemeGetter};

export function SetTheme(theme: string): Maybe<ThemeNotExist> {
    // Check if theme exists
    if (!availableThemesGetter().includes(theme)) {
        return Maybe.Err(new ThemeNotExist(`Theme: "${theme}" doesn't exist`));
    }
    // Update theme
    document.getElementsByTagName("html")[0].setAttribute("data-theme", theme);
    currentThemeSetter(theme);
    return Maybe.Ok();
}

// Note: This works only if new theme was added, but ignores if theme was removed
// (as long as theme was removed from DEFAULT_THEMES it considered a custom one)
function CheckForNewThemes() {
    for (const defaultTheme of DEFAULT_THEMES) {
        if (!availableThemesGetter().includes(defaultTheme)) {
            availableThemesSetter([...availableThemesGetter(), defaultTheme]);
        }
    }
}