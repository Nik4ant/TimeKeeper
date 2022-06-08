import {createSignal, Accessor, Setter} from "solid-js";

export async function createStorageSignal<T>(key: string, initValue: T): Promise<[Accessor<T>, Setter<T>]> {
    const storageCurrent = await chrome.storage.sync.get(key);
    let _initVal = initValue;
    // Using value from storage if it was set before
    if (storageCurrent[key] !== undefined) {
        _initVal = storageCurrent[key];
    }
    // If not initialising value in storage
    else {
        await chrome.storage.sync.set({[key]: initValue});
    }
    const [getValue, setValue] = createSignal<T>(_initVal);

    const customSetter = (newValue: T) => {
        // Changing value
        setValue(newValue as any);
        // Updating value in storage
        chrome.storage.sync.set({[key]: newValue});
        return newValue;
    };

    return [getValue, customSetter as Setter<T>];
}


export async function connectToStorageSignal<T>(key: string): Promise<Accessor<T>> {
    const currentStorageValue = (await chrome.storage.sync.get(key))[key];
    const [getter, setter] = createSignal<T>(currentStorageValue);
    // Updating value if corresponding value in storage has changed
    chrome.storage.onChanged.addListener((changes, _) => {
        if (changes[key]) {
            setter<T>(changes[key].newValue);
        }
    });
    return getter;
}