import {createSignal, Accessor, Setter} from "solid-js";

export async function createStorageSignalAsync<T>(key: string, initValue: T): Promise<[Accessor<T>, Setter<T>]> {
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


export async function connectToStorageSignalAsync<T>(key: string): Promise<Accessor<T>> {
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


// TODO: add doc here everywhere + share it on Discord?
export function createStorageSignal<T>(key: string, initValue: T, onInitValueLoad: (value: T) => void = (_) => _): [Accessor<T>, Setter<T>] {
    const [getValue, setValue] = createSignal<T>(initValue);
    const customSetter = (newValue: T) => {
        // Changing value
        setValue(newValue as any);
        // Updating value in storage
        chrome.storage.sync.set({[key]: newValue});
        return newValue;
    };
    // Note: The best way to connect to storage synchronously is to create signal with
    // init value and if necessary update it after value from storage is loaded
    chrome.storage.sync.get(key).then((storageCurrent) => {
        if (storageCurrent[key] !== undefined) {
            customSetter(storageCurrent[key]);
            onInitValueLoad(storageCurrent[key]);
        }
        else {
            // Initializing value in storage
            chrome.storage.sync.set({[key]: initValue});
        }
    });

    return [getValue, customSetter as Setter<T>];
}