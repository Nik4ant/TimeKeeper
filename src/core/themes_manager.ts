import {Maybe, ErrorType} from "../utils/custom_error";
import {createStorageSignalAsync} from "../utils/storage_manager";


class ThemeNotExist implements ErrorType {
    message: string;
    theme: string;

    constructor(theme: string) {
        this.message = `Theme: "${theme}" doesn't exist`;
        this.theme = theme;
    }
}


const DEFAULT_THEMES = ["night", "forest", "dark", "light", "cyberpunk"];
// Signal for list of available themes
const THEMES_STORAGE_NAME = "TimeKeeperThemes";
export let [availableThemes, setAvailableThemes] = await createStorageSignalAsync<string[]>(THEMES_STORAGE_NAME, DEFAULT_THEMES);
CheckForNewThemes();

// Signal for current theme
const LATEST_THEME_STORAGE_NAME = "TimeKeeperLatestTheme";
let [currentTheme, setCurrentTheme] = await createStorageSignalAsync<string>(LATEST_THEME_STORAGE_NAME, DEFAULT_THEMES[0]);
// Set theme on load
SetTheme(currentTheme());
// WARNING: This will work fine as long as themes are constant values and can't be created by user
export {currentTheme};

export function SetTheme(theme: string): Maybe<ThemeNotExist> {
    // Check if theme exists
    if (availableThemes().indexOf(theme) === -1) {
        return Maybe.Err(new ThemeNotExist(theme));
    }
    // Update theme
    document.getElementsByTagName("html")[0].setAttribute("data-theme", theme);
    setCurrentTheme(theme);
    return Maybe.Ok();
}

// Note: This works only if new theme was added, but ignores if theme was removed
// (as long as theme was removed from DEFAULT_THEMES it considered a custom one)
function CheckForNewThemes() {
    for (const defaultTheme of DEFAULT_THEMES) {
        if (availableThemes().indexOf(defaultTheme) === -1) {
            setAvailableThemes([...availableThemes(), defaultTheme]);
        }
    }
}