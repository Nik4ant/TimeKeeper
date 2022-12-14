import {createSignal, For, Show} from "solid-js";
import {TabooApi, TABOO_STORAGE_NAME, MAX_TABOO_LENGTH} from "../../../../core/taboo_api";
import {RiSystemDeleteBin2Line} from "solid-icons/ri";
import {connectToStorageSignalAsync} from "../../../../utils/storage_manager";


function TabooForm() {
    const [currentError, setCurrentError] = createSignal<string>("");

    function addTaboo(tabooDomain: string) {
        var result = TabooApi.Add(tabooDomain);
        if (!result.isOk)
            setCurrentError(result.error.message);
        else
            setCurrentError('');
    }


    const tabooInputElement = (<input class="input bg-base-300 border-base-content border-r-0 w-1/2 p-1.5 text-lg focus:outline-none focus:border-primary-focus"
                                      classList={{"border-error focus:border-error": currentError().length !== 0}}
                                      type="text" placeholder="example.com" maxLength={MAX_TABOO_LENGTH}/>) as HTMLInputElement;
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
        var result = TabooApi.Remove(tabooDomain);
        // Error might occur, but only in wierd cases if something wrong with the code
        if (!result.isOk)
            alert(`Unpredictable error. Contact the developer if possible. Thank you. Error message:\n${result.error.message}`);
    }

    const deleteIcon = (<RiSystemDeleteBin2Line size={24} class={"text-error"}
                                                onClick={_ => removeTaboo(props.website)} /> as HTMLOrSVGImageElement);
    const tabooWebsite = (<p class="flex-1 font-medium text-base text-base-content">{props.website}</p> as HTMLParagraphElement);
    // Special hover effect (taboo websites is crossed when delete icon is hovered
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
                <For each={storageTabooGetter()}>{(tabooWebsite, i) =>
                    <TabooWebsite website={tabooWebsite} />
                }</For>
            </div>
        </div>
    </>
}