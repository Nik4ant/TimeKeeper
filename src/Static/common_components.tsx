/** @jsxImportSource solid-js **/

import "solid-js";


// TODO: maybe add href to chrome marketplace
export function TimeKeeperLogo() {
    return (
        <>
            <a class="flex items-center basis-2/3 text-3xl font-black">
                <span class="self-center bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
                TimeKeeper
                </span>
            </a>
        </>
    );
}

// TODO: make new (custom one)
export function Button(props) {
    return <button class="items-center justify-center mx-2 p-0.5 mr-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800">
        {props.content}
    </button>
}