import {createSignal, Accessor, Setter, Component, Show} from "solid-js";
import {AiOutlinePauseCircle, AiOutlinePlayCircle} from 'solid-icons/ai';
import "./pomodoro.css";
import {Pomodoro, POMODORO_INFO_STORAGE_NAME, PomodoroInfo, TimerInfo} from "../../../../core/pomodoro_api";
import {Unreachable} from "../../../../utils/custom_error";
import {SendChromeMessage} from "../../../../utils/message_api";
import {FaSolidBusinessTime} from "solid-icons/fa";
import {FaSolidUserClock} from 'solid-icons/fa'
import {connectToStorageSignalAsync} from "../../../../utils/storage_manager";
import {render} from "solid-js/web";


// Returns timer info from the background or undefined if error occurred in the process
// (Note: Error is not returned because it's handled in the process)
async function GetBackgroundTimerInfo(): Promise<TimerInfo | undefined> {
    var response = await SendChromeMessage<Pomodoro.Message.GetTimerResponse>(new Pomodoro.Message.GetTimer())
    // Handling possible error from the messaging system
    if (!response.isOk) {
        Unreachable(response.error.message);
        return;
    }
    return await Promise.resolve(response.value);
}

interface TimeInputProps {
    totalTimeMs: Accessor<number>;
    setTotalTimeMs: Setter<number>;
    currentError?: Accessor<string>;
}
const TimeInput: Component<TimeInputProps> = ({totalTimeMs, setTotalTimeMs, currentError}) => {
    const ValidateNumber = (event: InputEvent & {currentTarget: HTMLInputElement, target: Element},
                            max: number, min: number = 0): number => {
        const sender: HTMLInputElement = event.currentTarget;
        // Validating length because setting attribute maxLength does nothing for some reason...
        sender.value = sender.value
            .replace(/[^0-9.]/g, '')
            .replace(/(\..*?)\..*/g, '$1');

        const parsedValue = Number.parseInt(sender.value);
        // Validating number range
        const result = parsedValue <= max && parsedValue >= min ? parsedValue : min;
        sender.valueAsNumber = result;
        sender.value = result.toString();

        return result;
    };

    const totalTimeSeconds = () => totalTimeMs() / 1000;
    const currentSeconds = () => Math.floor(totalTimeSeconds()) % 60;
    const currentMinutes = () => Math.floor(totalTimeSeconds() / 60) % 60;
    const currentHours = () => Math.floor(totalTimeSeconds() / 3600);
    // Note: Just don't question...weird classList is used to keep input size based on value length.
    // This can definitely be improved, but it works for now.
    return <>
        <div class="flex flex-col z-10">
            <div class="flex flex-row space-x-0">
                <input type="number" value={currentHours()} classList={{"w-[1.3rem]": currentHours().toString().length <= 1, "w-[2.55rem]": currentHours().toString().length === 2}}
                       class="number-input !rounded-none leading-1 !pl-0 !pr-0" maxLength="2"
                       onInput={e => setTotalTimeMs(currentSeconds() * 1000 + currentMinutes() * 1000 * 60 + 1000 * 3600 * ValidateNumber(e, 24))} />
                <span class="bg-opacity-0 time-hint-tag">h</span>

                <input type="number" value={currentMinutes()} classList={{"w-[1.3rem]": currentMinutes().toString().length <= 1, "w-[2.55rem]": currentMinutes().toString().length === 2}}
                       class="number-input !rounded-none leading-1 !pl-0 !pr-0" maxLength="2"
                       onInput={e => setTotalTimeMs(currentSeconds() * 1000 + 1000 * 60 * ValidateNumber(e, 60) + currentHours() * 1000 * 3600)} />
                <span class="bg-opacity-0 time-hint-tag">m</span>

                <input type="number" value={currentSeconds()} classList={{"w-[1.3rem]": currentSeconds().toString().length <= 1, "w-[2.55rem]": currentSeconds().toString().length === 2}}
                       class="number-input !rounded-none leading-1 !pl-0 !pr-0" maxLength="2"
                       onInput={e => setTotalTimeMs(1000 * ValidateNumber(e, 60) + currentMinutes() * 1000 * 60 + currentHours() * 1000 * 3600)} />
                <span class="bg-opacity-0 time-hint-tag">s</span>
            </div>
            <Show when={currentError && currentError().length !== 0}>
                <p class="text-lg font-medium text-error">{currentError()}</p>
            </Show>
        </div>
    </>
}
// Note: Having separate interface feels dumb, but there is no better way to specify type
interface EditableTimerDisplayProps {
    isPauseFronted: Accessor<boolean>,
    timerValueMs: Accessor<number>,
    setTimerValueMs: Setter<number>
}
// Displays time in hh:mm:ss format that can be editable
const EditableTimerDisplay: Component<EditableTimerDisplayProps> = ({isPauseFronted, timerValueMs, setTimerValueMs}) => {
    // Values for countdown
    const totalSecondsLeft = () => timerValueMs() / 1000;
    const currentSeconds = () => Math.floor(totalSecondsLeft()) % 60;
    const currentMinutes = () => Math.floor(totalSecondsLeft() / 60) % 60;
    const currentHours = () => Math.floor(totalSecondsLeft() / 3600);

    return <>
        <div class="flex gap-5 text-base-content">
            <Show when={!isPauseFronted()} fallback={<TimeInput totalTimeMs={timerValueMs} setTotalTimeMs={setTimerValueMs} />}>
                <div class="flex text-center z-10">
                    <span class="countdown-container-value"><span style={{"--value": currentHours()}}></span></span><span class="time-hint-tag">h</span>
                    <span class="countdown-container-value"><span style={{"--value": currentMinutes()}}></span></span><span class="time-hint-tag">m</span>
                    <span class="countdown-container-value"><span style={{"--value": currentSeconds()}}></span></span><span class="time-hint-tag">s</span>
                </div>
            </Show>
        </div>
    </>
}
// Timer component that renders and handles most of the logic for pomodoro timer
function Timer() {
    // Note: It's highly recommended to check explanation in pomodoro_api.ts before proceeding

    // Interval is used to update only fronted timer
    let timerTickInterval: NodeJS.Timer;
    // region Timer signals
    const [timerValueMs, setTimerValueMs] = createSignal(0);
    // Length of the timer (it resets only when timer ends or restarted)
    // (Initial value is 1 used to avoid division by 0 in the effect below)
    const [initialTimerDurationMs, setInitialTimerDurationMs] = createSignal(1);
    // Used for a circle indicator
    const timeLeftInPercentage = () => {
        return timerValueMs() * 100 / initialTimerDurationMs();
    };
    // Only indicates pause for frontend elements. Changes in background code occur only if specific API was called
    const [isPauseFronted, setIsPauseFrontend] = createSignal(true);
    // endregion

    // Handles play/pause icon value change
    function OnTimerIconClicked(sender: HTMLInputElement, value: boolean): void {
        // Ignore if timer values are zero
        if (timerValueMs() === 0) {
            // Set values back to indicate that nothing happened
            sender.checked = !value;
            setIsPauseFrontend(!value);
            return;
        }
        // Play/start icon was pressed
        if (!value) {
            // Note: Works for now, but could be better
            // Used to update UI only if no error occurred (values are updated inside message callbacks)
            var isAnyError = false;
            const updateUIOnStartIcon = () => {
                // Updating UI only if no error occurred
                if (!isAnyError) {
                    setIsPauseFrontend(value);
                    timerTickInterval = setInterval(OneSecondTick, 1000);
                } else {
                    // Otherwise reset values
                    setIsPauseFrontend(!value);
                    sender.checked = !value;
                }
            }

            // Step 1. Check if this is a new timer (not an ongoing one)
            // Note: This is also works if timer was paused and its values were overwritten
            if (initialTimerDurationMs() !== timerValueMs()) {
                // Step 2.1 if it is, create a timer
                SendChromeMessage<Pomodoro.Message.CreateTimerResponse>(new Pomodoro.Message.CreateTimer(timerValueMs()))
                    .then((response) => {
                        // Handling possible error from messaging system
                        if (!response.isOk) {
                            Unreachable(response.error.message);
                            isAnyError = true;
                        } else {
                            // Handling possible error from the API
                            const result = response.value;
                            if (!result.isOk) {
                                alert(result.error.message);
                                isAnyError = true;
                            } else {
                                setInitialTimerDurationMs(timerValueMs());
                            }
                        }
                        updateUIOnStartIcon();  // Updating UI
                    });
            }
            else {
                // Step 2.2 If it's not, unpause existing timer
                SendChromeMessage<Pomodoro.Message.UnpauseResponse>(new Pomodoro.Message.Unpause())
                    .then((response) => {
                        // Handling possible error from the messaging system
                        if (!response.isOk) {
                            Unreachable(response.error.message);
                            isAnyError = true;
                        } else {
                            const result = response.value;
                            // Handling possible error from the API
                            if (!result.isOk) {
                                Unreachable(response.error.message);
                                isAnyError = true;
                            }
                        }
                        updateUIOnStartIcon();  // Updating UI
                    });
            }
        }
        // Pause icon was pressed
        else {
            clearInterval(timerTickInterval);
            SendChromeMessage<Pomodoro.Message.PauseResponse>(new Pomodoro.Message.Pause())
                .then((response) => {
                    // Handling possible error from the messaging system
                    if (!response.isOk) {
                        Unreachable(response.error.message);
                    } else {
                        // Response value is a promise, so need to wait for result as well
                        Promise.resolve(response.value).then((result) => {
                            // Handling possible error from the API
                            if (!result.isOk) {
                                Unreachable(result.error.message);
                            }
                        });
                    }
                });
        }
    }
    function OneSecondTick() {
        const newMsValue = timerValueMs() - 1000;
        // Note: Values can be negative because they are loaded from backend where precision is much higher
        if (newMsValue <= 0) {
            clearInterval(timerTickInterval);
            setTimerValueMs(0);
            setIsPauseFrontend(true);
            /*
            Note: This approach is bad because if fronted code executes earlier than background code than
            frontend timer values won't be in sync with background (real) timer values.
            At the same time it's good enough because the likelihood of this being an issue is very low for two reasons:
            1) Popup page won't be open 24/7, which means that when timer runs out
            the odds of user being on the popup page during that time are very low.
            2) Even if situation from 1 occurs the chances of desync happening are low, HOWEVER
            even if desync occurs this is not critical because user can just reopen popup page (or pomodoro tab)
            and everything will be fine
            */
            // Updating values after timer runs out (ON THE FRONTEND PART!)
            GetBackgroundTimerInfo().then((timerInfo) => {
                if (timerInfo === undefined) {
                    return;
                }
                setTimerValueMs(timerInfo.timeLeftMs);
                setInitialTimerDurationMs(timerInfo.durationMs);
            });
            return;
        }
        setTimerValueMs(newMsValue);
    }

    // Loading the latest timer info
    GetBackgroundTimerInfo().then((timerInfo) => {
        // Skip if error occurred
        if (timerInfo === undefined) {
            return;
        }
        // 1) Set values for visual elements
        setIsPauseFrontend(timerInfo.isPaused);
        setTimerValueMs(timerInfo.timeLeftMs);
        // 2) If there is ongoing timer in the background starting interval immediately
        if (!timerInfo.isPaused)
            timerTickInterval = setInterval(OneSecondTick, 1000);
        // 3) Since signal value can't be 0 extra check is necessary
        if (timerInfo.durationMs !== 0)
            setInitialTimerDurationMs(timerInfo.durationMs);
    });

    return <>
        <div class="flex flex-col space-y-2">
            <div class="radial-progress text-primary z-0" style={{"--value": timeLeftInPercentage(),
                "--thickness": "4px", "--size": "14rem"}}>
                <div class="flex flex-col justify-center">
                    <EditableTimerDisplay isPauseFronted={isPauseFronted} timerValueMs={timerValueMs} setTimerValueMs={setTimerValueMs} />
                    <div class="absolute bottom-5 left-1/2 right-1/2 flex justify-center">
                        <label class="h-1/2 swap swap-rotate text-secondary hover:text-secondary-focus">
                            <input type="checkbox" checked={isPauseFronted()}
                                   onClick={(e) => OnTimerIconClicked(e.currentTarget, !isPauseFronted())} />
                            <AiOutlinePauseCircle class="swap-off fill-current" size={48} />
                            <AiOutlinePlayCircle class="swap-on fill-current" size={48} />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    </>
}
// Mini form for changing pomodoro info
function PomodoroForm({rerenderTimer}) {
    function UpdatePomodoroInfo() {
        SendChromeMessage<Pomodoro.Message.SetInfoResponse>(new Pomodoro.Message.SetInfo(workSessionDurationMs(), breakDurationMs()))
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
                        // If no errors occurred forcing timer component to rerender (update) itself
                        rerenderTimer();
                    }
                }
            });
    }

    // Connecting to existing storage signal to sync with pomodoro info on the backend
    var [pomodoroInfo, __pomodoroInfoSetter] = createSignal<PomodoroInfo>({
        // Will be overwritten later with the actual values from storage
        isWorkingSession: true,
        workSessionDurationMs: 0,
        breakDurationMs: 0,
    });
    connectToStorageSignalAsync<PomodoroInfo>(POMODORO_INFO_STORAGE_NAME).then((storageGetter) => {
        pomodoroInfo = storageGetter;
        __pomodoroInfoSetter(storageGetter());
        // Updating all dependant signals with fresh values
        setWorkSessionDurationMs(pomodoroInfo().workSessionDurationMs);
        setBreakDurationMs(pomodoroInfo().breakDurationMs);
    });

    const [workSessionDurationMs, setWorkSessionDurationMs] = createSignal(0);
    const [breakDurationMs, setBreakDurationMs] = createSignal(0);
    const [currentError, setCurrentError] = createSignal("");

    return <>
        <div class="flex flex-col space-y-2.5 items-center">
            <h1 class="text-3xl font-medium">Pomodoro details</h1>

            <span class="label-text text-lg font-medium">Work session duration:</span>
            <TimeInput totalTimeMs={workSessionDurationMs}
                       setTotalTimeMs={setWorkSessionDurationMs} />

            <span class="label-text text-lg font-medium">Break duration:</span>
            <TimeInput totalTimeMs={breakDurationMs}
                       setTotalTimeMs={setBreakDurationMs} />

            <Show when={currentError().length !== 0}>
                <p class="text-center text-lg font-medium text-error">{currentError()}</p>
            </Show>

            <button onClick={UpdatePomodoroInfo} class="btn btn-primary w-1/2">Update</button>
        </div>
    </>
}
// Switch like indicator displaying current pomodoro state: work/rest
function PomodoroIndicator() {
    // Connecting to existing storage signal to sync with pomodoro info in the background
    var [storagePomodoroInfo, __setPomodoroInfo] = createSignal<PomodoroInfo>({
        // Will be overwritten later with the actual values from storage
        isWorkingSession: true, workSessionDurationMs: 0, breakDurationMs: 0,
    });
    connectToStorageSignalAsync<PomodoroInfo>(POMODORO_INFO_STORAGE_NAME).then((storageGetter) => {
        storagePomodoroInfo = storageGetter;
        __setPomodoroInfo(storageGetter());
    });

    return <>
        <div class="self-center flex flex-row space-x-4 justify-center">
            <h2 class="font-medium text-2xl self-center align-middle">State:</h2>
            <label class="swap swap-flip cursor-default">
                <input type="checkbox" checked={storagePomodoroInfo().isWorkingSession} disabled />

                <div class="swap-on">
                    <div class="flex flex-col justify-center">
                        <FaSolidBusinessTime size={48} class="text-primary" />
                        <span class="text-base-content text-lg">Work</span>
                    </div>
                </div>
                <div class="swap-off">
                    <div class="flex flex-col justify-center">
                        <FaSolidUserClock size={48} class="text-primary" />
                        <span class="text-base-content text-lg">Rest</span>
                    </div>
                </div>
            </label>
        </div>
    </>
}

export default function PomodoroRoot() {
    // Rerenders timer component (used as a callback for PomodoroForm to force timer to reload its values)
    function RerenderTimer() {
        const timerContainerElement = document.getElementById("TimerContainer");
        // Clear current one
        timerContainerElement.innerHTML = '';
        // Rerender component
        render(Timer, timerContainerElement);
    }

    return <>
        <div class="flex justify-around p-2">
            <div class="flex flex-col space-y-5 justify-center">
                <span id="TimerContainer"><Timer /></span>
                <PomodoroIndicator />
            </div>
            <PomodoroForm rerenderTimer={RerenderTimer} />
        </div>
    </>
}