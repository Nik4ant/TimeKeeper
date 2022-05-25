// Without importing css, it doesn't load at all
import "../styles/popup.css";
import { render } from "solid-js/web";


function PopupRoot() {
    return (
        <>
            <div class="w-max w-128 p-8 text-center">
                <span class="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">Hello there</span>
                <br />
                <p class="font-mono text-xl text-emerald-700">Tailwind + Solid.js let's goooo</p>
            </div>
        </>
    );
}

// This is just an example to show that everything works
render(() => <PopupRoot />, document.getElementById("root") as HTMLElement);