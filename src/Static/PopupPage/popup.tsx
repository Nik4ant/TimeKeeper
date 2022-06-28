/** @jsxImportSource solid-js **/

// Without importing css, it doesn't load at all
import "../styles/popup.css";
import {TimeKeeperLogo} from "../common-components";
import PomodoroTabContent from "./pomodoro_tab";
import TabooTabContent from "./taboo_tab";
import ThemesTabContent from "./themes_tab";

import {Match, render, Switch} from "solid-js/web";
import {BsShieldLockFill} from 'solid-icons/bs';
import {createSignal, onMount} from "solid-js";

function Navbar({tabSetter}) {
    function NavbarTab(props) {
        // Note: props.icon is component
        const result = (
            <>
                <li class="border-b border-base-content">
                    <div class="inline-flex space-x-2 p-2">
                        {props.icon}
                        <p class="text-base-content">{props.text}</p>
                    </div>
                </li>
            </>
        ) as HTMLElement;
        // Changing tab on click
        result.addEventListener("click", (_) => {
            tabSetter(props.tabNum);
        });

        return result;
    }

    // TODO: I CAN MAKE SELECTED TAB EFFECT USING THIS: https://www.solidjs.com/tutorial/bindings_classlist?solved
    return (
        <>
            <div class="bg-base-200 px-4 py-2.5">
                <div class="w-full container flex flex-row space-x-16 justify-between items-center">
                    <TimeKeeperLogo />
                    <div class="basis-1/3">
                        <ul class="flex flex-row space-x-2 text-sm font-medium text-center">
                            <NavbarTab tabNum="1" text="Taboo" icon={<BsShieldLockFill class="navbar-icon" size={24} />} />
                            <NavbarTab tabNum="2" text="Pomodoro" icon={<BsShieldLockFill class="navbar-icon" size={24} />} />
                            <NavbarTab tabNum="3" text="Themes" icon={<BsShieldLockFill class="navbar-icon" size={24} />} />
                        </ul>
                    </div>
                </div>
            </div>
        </>
    );
}


function PopupRoot() {
    const [currentTab, setCurrentTab] = createSignal<string>("1");
    // Loading theme from storage
    onMount(async() => {
        const theme = (await chrome.storage.sync.get("UITheme"))["UITheme"];
        if (theme !== undefined) {
            // Changing theme attribute
            document.getElementsByTagName("html")[0].setAttribute("data-theme", theme);
        }
    });

    return (
        <>
            <div class="w-full y-full bg-no-repeat bg-cover bg-base-100 min-w-max">
                <div>
                    <Navbar tabSetter={setCurrentTab} />
                    <Switch>
                        <Match when={currentTab() === "1"}>
                            <TabooTabContent />
                        </Match>
                        <Match when={currentTab() === "2"}>
                            <PomodoroTabContent />
                        </Match>
                        <Match when={currentTab() === "3"}>
                            <ThemesTabContent />
                        </Match>
                    </Switch>
                </div>
            </div>
        </>
    );
}


render(() => <PopupRoot />, document.getElementById("root") as HTMLElement);