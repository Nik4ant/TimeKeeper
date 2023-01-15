import {createSignal, For, Show} from "solid-js";
import {TABOO_STORAGE_NAME, Taboo} from "../../../../core/taboo_api";
import {RiSystemDeleteBin2Line} from "solid-icons/ri";
import {connectToStorageSignalAsync} from "../../../../utils/storage_manager";
import {Unreachable} from "../../../../utils/custom_error";
import {SendChromeMessage} from "../../../../utils/message_api";
import "./taboo.css";


function TabooForm() {
    const [currentError, setCurrentError] = createSignal<string>("");

    function addTaboo(tabooDomain: string) {
        // Send message to the background to add taboo
        SendChromeMessage<Taboo.Message.AddResponse>(new Taboo.Message.Add(tabooDomain))
            .then((response) => {
                // Handling possible error from the messaging system
                if (!response.isOk) {
                    Unreachable(response.error.message);
                } else {
                    // Handling possible error from the API
                    const result = response.value;
                    if (!result.isOk) {
                        setCurrentError(result.error.message);
                    } else {
                        setCurrentError('');
                        // Clear input field when taboo was successfully added
                        tabooInputElement.value = "";
                    }
                }
            });
    }

    const tabooInputElement = (<input class="input-underline w-1/2 p-1.5" type="text" placeholder="example.com"
                                      name="tabooInputElement" maxLength={Taboo.MAX_LENGTH}
                                      classList={{"!border-error !focus:border-error": currentError().length !== 0}} />) as HTMLInputElement;
    tabooInputElement.addEventListener("keyup", (e) => {
        if (e.key.toLowerCase() === "enter")
            addTaboo(tabooInputElement.value);
    });
    return <>
        <div class="form-control text-base font-medium">
            <label class="label">
                <span class="label-text text-xl font-medium">Enter taboo domain:</span>
            </label>
            <label class="input-group input-group-md input-group-underline" >
                <span class="bg-opacity-0 input-tag-underline text-lg"
                      classList={{"!border-error !focus:border-error": currentError().length !== 0}}>https://</span>
                {tabooInputElement}
            </label>
            <Show when={currentError().length !== 0}>
                <p class="mt-2 ml-2 text-lg font-medium text-error">{currentError()}</p>
            </Show>
        </div>
    </>
}

function TabooWebsite(props) {
    function removeTaboo(tabooDomain: string) {
        SendChromeMessage<Taboo.Message.RemoveResponse>(new Taboo.Message.Remove(tabooDomain))
            .then((response) => {
                // Handling possible error from the messaging system
                if (!response.isOk) {
                    Unreachable(response.error.message);
                } else {
                    // Handling possible error from the API
                    const result = response.value;
                    if (!result.isOk) {
                        Unreachable(result.error.message);
                    }
                }
            });
    }

    const deleteIcon = (<RiSystemDeleteBin2Line size={26} class="text-error ml-auto mr-2"
                                                onClick={_ => removeTaboo(props.website)} /> as HTMLOrSVGImageElement);
    const tabooWebsite = (<span class="font-medium text-base">{props.website}</span> as HTMLSpanElement);
    // Special hover effect (taboo website is crossed when delete icon is hovered
    const HOVER_EFFECT_CLASSES = ["line-through", "decoration-error/80", "decoration-4"];
    deleteIcon.addEventListener("mouseover", (_) => tabooWebsite.classList.add(...HOVER_EFFECT_CLASSES));
    deleteIcon.addEventListener("mouseout", (_) => tabooWebsite.classList.remove(...HOVER_EFFECT_CLASSES));

    return <>
        <div class="taboo-website-container m-2 p-3">
            {tabooWebsite}
            {deleteIcon}
        </div>
    </>
}

export default function TabooRoot() {
    // Connecting to existing storage signal to dynamically update taboo websites list
    var [storageTabooGetter, __storageTabooSetter] = createSignal<string[]>([]);
    connectToStorageSignalAsync<string[]>(TABOO_STORAGE_NAME).then((storageGetter) => {
        storageTabooGetter = storageGetter;
        __storageTabooSetter(storageGetter());
    });

    return <>
        <div class="flex flex-col space-y-3">
            <TabooForm />
            <div class="grid grid-cols-2 gap-x-4">
                <For each={storageTabooGetter()}>{(tabooWebsite, _) =>
                    <TabooWebsite website={tabooWebsite} />
                }</For>
            </div>
        </div>
    </>
}