import "./popup.css";
import { TimeKeeperLogo } from "../common/components";
import { Dynamic, render } from "solid-js/web";
import { createSignal, For } from "solid-js";
import { FaSolidBusinessTime } from 'solid-icons/fa';
import { IoColorPaletteSharp } from 'solid-icons/io'
import { RiDocumentFileForbidLine } from 'solid-icons/ri'
import ThemesRoot from "./tabs/themes/themes";
import TabooRoot from "./tabs/taboo/taboo";
import PomodoroRoot from "./tabs/pomodoro/pomodoro";


const TABS = {
    // First item is component to render, second is tab name displayed in navbar and third is icon.
    // Note: Without: () => [icon's JSX] there is an error about indisposed computations
    0: [TabooRoot, "Taboo", () => <RiDocumentFileForbidLine size={24} class="navbar-icon" />],
    1: [PomodoroRoot, "Pomodoro", () => <FaSolidBusinessTime size={24} class="navbar-icon" />],
    2: [ThemesRoot, "Themes", () => <IoColorPaletteSharp size={24} class="navbar-icon" />]
}

function Navbar(props) {
    return <>
        <div class="flex gap-8 w-full pb-2">
            <TimeKeeperLogo />
            <div class="tabs tabs-boxed min-w-max">
                <For each={Object.keys(TABS)}>{(tab, i) =>
                    <div class="tab flex-nowrap gap-2" classList={{"tab-active": props.activeTab === i()}}
                         onClick={() => props.setActiveTab(i())}>
                        {TABS[i()][2]}
                        <a class="whitespace-nowrap text-base">{TABS[i()][1]}</a>
                    </div>
                }</For>
            </div>
        </div>
    </>
}

function PopupRoot() {
    const [activeTab, setActiveTab] = createSignal(0);

    // TODO: typography doesn't change anything no matter how I try (google tutorials for that)
    return <>
        <div class="flex flex-col w-full p-4 prose prose-slate">
            <Navbar activeTab={activeTab()} setActiveTab={setActiveTab} />
            <Dynamic component={TABS[activeTab()][0]} />
        </div>
    </>;
}

render(() => <PopupRoot />, document.getElementById("root"));

