/** @jsxImportSource solid-js **/

// Without importing css, it doesn't load at all
import "../styles/taboo.css";
import {TimeKeeperLogo} from "../common-components";
import {render} from "solid-js/web";


function TabooRoot() {
    return (
        <div class="dark">
            <div class="flex justify-center items-center h-screen bg-background-light dark:bg-background-dark">
                <div class="p-8 bg-blend-lighten bg-primary-dark/15">
                    <h1 class="text-2xl text-surface-on-light dark:text-surface-on-dark">123</h1>
                </div>
            </div>
        </div>
    );
}


render(() => <TabooRoot />, document.getElementById("root") as HTMLElement);