/** @jsxImportSource solid-js **/

// Without importing css, it doesn't load at all
import "../styles/taboo.css";
import {render} from "solid-js/web";


function TabooRoot(props) {
    return (
        <div>
            <div class="flex justify-center items-center h-screen bg-background-light dark:bg-background-dark">
                <div class="p-8 bg-blend-lighten bg-primary-dark/15 flex space-x-4">
                    <h1 class="text-2xl text-surface-on-light dark:text-surface-on-dark">{props.tabooWebsite}</h1>
                    <img src={props.tabooFaviconUrl} />
                </div>
            </div>
        </div>
    );
}

// Receiving data from background script before rendering
chrome.runtime.onMessage.addListener((message, sender) => {
    if (message["tabooWebsite"]) {
        // Not every website has favicon
        // TODO: add default favicon?
        let favicon = "DEFAULT_FAVICON_LATER";
        if (message["tabooFaviconUrl"]) {
            favicon = message["tabooFaviconUrl"];
        }
        render(() => <TabooRoot tabooWebsite={message["tabooWebsite"]} tabooFaviconUrl={favicon} />,
            document.getElementById("root") as HTMLElement);
    }
});