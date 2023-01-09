import {createSignal, For, Show} from "solid-js";
import {TABOO_STORAGE_NAME, Taboo} from "../../../../core/taboo_api";
import {RiSystemDeleteBin2Line} from "solid-icons/ri";
import {connectToStorageSignalAsync} from "../../../../utils/storage_manager";
import {Unreachable} from "../../../../utils/custom_error";
import {SendChromeMessage} from "../../../../utils/message_api";


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
                    if (!response.isOk) {
                        setCurrentError(response.error.message);
                    } else {
                        setCurrentError('');
                        // Clear input field when taboo was successfully added
                        tabooInputElement.value = "";
                    }
                }
            });
    }


    const tabooInputElement = (<input class="input bg-base-300 border-base-content border-r-0 w-1/2 p-1.5 text-lg focus:outline-none focus:border-primary-focus"
                                      classList={{"border-error focus:border-error": currentError().length !== 0}}
                                      type="text" placeholder="example.com" maxLength={Taboo.MAX_LENGTH}/>) as HTMLInputElement;
    tabooInputElement.addEventListener("keyup", (e) => {
        if (e.key.toLowerCase() === "enter")
            addTaboo(tabooInputElement.value);
    });
    return <>
        <div class="form-control text-base font-medium">
            <label class="label">
                <span class="label-text text-lg font-medium">Enter taboo domain:</span>
            </label>
            <label class="input-group">
                <span class="border-2 border-r-0 border-base-content">https://</span>
                {tabooInputElement}
                <button onClick={() => addTaboo(tabooInputElement.value)} class="btn btn-primary items-center justify-center rounded-box">Add</button>
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

    const deleteIcon = (<RiSystemDeleteBin2Line size={24} class={"text-error"}
                                                onClick={_ => removeTaboo(props.website)} /> as HTMLOrSVGImageElement);
    const tabooWebsite = (<p class="flex-1 font-medium text-base text-base-content">{props.website}</p> as HTMLParagraphElement);
    // Special hover effect (taboo website is crossed when delete icon is hovered
    const HOVER_EFFECT_CLASSES = ["line-through", "decoration-error", "decoration-4"];
    deleteIcon.addEventListener("mouseover", (_) => tabooWebsite.classList.add(...HOVER_EFFECT_CLASSES));
    deleteIcon.addEventListener("mouseout", (_) => tabooWebsite.classList.remove(...HOVER_EFFECT_CLASSES));

    return <>
        <div class="flex space-x-2 items-center m-2 p-2.5 bg-base-300 border border-accent-focus rounded-md">
            {tabooWebsite}
            {deleteIcon}
        </div>
    </>
}

export default function TabooRoot() {
    // Connecting to existing storage signal to dynamically change frontend content.
    var [storageTabooGetter, __storageTabooSetter] = createSignal<string[]>([]);
    connectToStorageSignalAsync<string[]>(TABOO_STORAGE_NAME).then((storageGetter) => {
        storageTabooGetter = storageGetter;
        __storageTabooSetter(storageGetter());
    });

    return <>
        <div>
            <TabooForm />
            <div>
                <For each={storageTabooGetter()}>{(tabooWebsite, _) =>
                    <TabooWebsite website={tabooWebsite} />
                }</For>
            </div>
        </div>
    </>
}