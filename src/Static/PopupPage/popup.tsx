/** @jsxImportSource solid-js **/

// Without importing css, it doesn't load at all
import "../styles/popup.css";
import {TimeKeeperLogo} from "../common-components";
import PomodoroTabContent from "./pomodoro_tab";
import TabooTabContent from "./taboo_tab";

import {Match, render, Switch} from "solid-js/web";
import {BsShieldLockFill} from 'solid-icons/bs';
import {createSignal} from "solid-js";


function Navbar({tabSetter, tabGetter}) {
    function NavbarTab(props) {
        // TODO: Special color for selected tab (PROPER IMPLEMENTATION. Maybe use effect thingies from solidjs)
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

    return (
        <>
            <div class="bg-base-200 px-4 py-2.5">
                <div class="w-full container flex flex-row space-x-16 justify-between items-center">
                    <TimeKeeperLogo />
                    <div class="basis-1/3">
                        <ul class="flex flex-row space-x-2 text-sm font-medium text-center">
                            <NavbarTab tabNum="1" text="Taboo" icon={<BsShieldLockFill class="navbar-icon" size={24} />} />
                            <NavbarTab tabNum="2" text="Pomodoro" icon={<BsShieldLockFill class="navbar-icon" size={24} />} />
                        </ul>
                    </div>
                </div>
            </div>
        </>
    );
}


function PopupRoot() {
    const [currentTab, setCurrentTab] = createSignal<string>("1");

    return (
        <>
            <div class="w-full y-full bg-no-repeat bg-cover bg-base-100 min-w-max">
                <div>
                    <Navbar tabSetter={setCurrentTab} tabGetter={currentTab} />
                    <Switch>
                        <Match when={currentTab() === "1"}>
                            <TabooTabContent />
                        </Match>
                        <Match when={currentTab() === "2"}>
                            <PomodoroTabContent />
                        </Match>
                    </Switch>
                </div>
            </div>
        </>
    );
}


render(() => <PopupRoot data-theme="night" />, document.getElementById("root") as HTMLElement);