/** @jsxImportSource solid-js **/

// Without importing css, it doesn't load at all
import "../styles/popup.css";
// Can't access global variables without importing background script
import "../../background";
import { TimeKeeperLogo } from "../common_components";
import PomodoroTabContent  from "./pomodoro_tab";
import TabooTabContent from "./taboo_tab";

import { render } from "solid-js/web";
import { BsShieldLockFill } from 'solid-icons/bs';


function NavbarTab(props) {
    // TODO: find a way to set up icon classes here (need another solution to pass icon element)
    return (
        <>
            <li class="mr-2">
                <a data-tab={props.tabNum} class="group default-navbar-link active-navbar-link">
                    {props.icon}
                    {props.text}
                </a>
            </li>
        </>
    );
}


function Navbar() {
    return (
        <>
            <div class="bg-white border-gray-200 px-4 py-2.5">
                <div class="w-full container flex flex-row space-x-16 justify-between items-center">
                    <TimeKeeperLogo />
                    <div class="border-b border-gray-200 basis-1/3">
                        <ul id="tabsMenu" class="flex text-sm font-medium text-center -mb-px text-gray-500">
                            <NavbarTab tabNum="1" text="Taboo" icon={<BsShieldLockFill size={32} />} />
                            <NavbarTab tabNum="2" text="Pomodoro" icon={<BsShieldLockFill size={32} />} />
                        </ul>
                    </div>
                </div>
            </div>
        </>
    );
}


function PopupRoot() {
    return (
        <>
            <div class="w-full y-full bg-no-repeat bg-cover bg-gradient-to-br from-[#ECE9E6] to-[#F1F1F1] min-w-max">
                <div>
                    <Navbar />
                    <TabooTabContent />
                    <PomodoroTabContent />
                </div>
            </div>
        </>
    );
}


render(() => <PopupRoot />, document.getElementById("root") as HTMLElement);