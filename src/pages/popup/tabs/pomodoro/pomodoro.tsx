import {createSignal, Accessor, Setter, Component, Show, lazy} from "solid-js";
import {AiOutlinePauseCircle, AiOutlinePlayCircle} from 'solid-icons/ai';
import "./pomodoro.css";
import {Pomodoro, POMODORO_INFO_STORAGE_NAME, PomodoroInfo} from "../../../../core/pomodoro_api";
import {Unreachable} from "../../../../utils/custom_error";
import {SendChromeMessage} from "../../../../utils/message_api";
import {FaSolidBusinessTime} from "solid-icons/fa";
import {FaSolidUserClock} from 'solid-icons/fa'
import {connectToStorageSignalAsync} from "../../../../utils/storage_manager";


// Note: Having separate interface feels dumb, but there is no better way to specify type
interface EditableTimerDisplayProps {
    isPauseFronted: Accessor<boolean>,
    timerValueMs: Accessor<number>,
    setTimerValueMs: Setter<number>
}
// Displays time in hh:mm:ss format that can be editable
const EditableTimerDisplay: Component<EditableTimerDisplayProps> = ({isPauseFronted, timerValueMs, setTimerValueMs}) => {
    function OnTimeInputValueChanged(newValueInMs: number) {
        // Validation is done by input field except the case when value is: "--:--:--"
        // so extra check for NaN is required
        if (!isNaN(newValueInMs)) {
            setTimerValueMs(newValueInMs);
        } else {
            setTimerValueMs(0);
        }
    }

    // Values for countdown
    const totalSecondsLeft = () => timerValueMs() / 1000;

    const currentSeconds = () => Math.floor(totalSecondsLeft()) % 60;
    const currentMinutes = () => Math.floor(totalSecondsLeft() / 60) % 60;
    const currentHours = () => Math.floor(totalSecondsLeft() / 3600);
    // Formatted time display
    const timeDisplay: Accessor<string> = () => `${currentHours().toString().padStart(2, '0')}:${currentMinutes().toString().padStart(2, '0')}:${currentSeconds().toString().padStart(2, '0')}`;

    return <>
        <div class="flex gap-5 text-base-content">
            <Show when={!isPauseFronted()} fallback={
                <input onInput={e => OnTimeInputValueChanged(e.currentTarget.valueAsNumber)} class="time-input z-10" type="time" step="1" value={timeDisplay()} />
            }>
                <div class="flex text-center z-10">
                    <span class="countdown-container-value"><span style={{"--value": currentHours()}}></span>:</span>
                    <span class="countdown-container-value"><span style={{"--value": currentMinutes()}}></span>:</span>
                    <span class="countdown-container-value"><span style={{"--value": currentSeconds()}}></span></span>
                </div>
            </Show>
        </div>
    </>
}
// Timer component that renders and handles most of the logic for pomodoro timer
// TODO: add reset button
function Timer() {
    // Interval is used to update only fronted timer
    // (During initial load there is no timer)
    let timerTickInterval: NodeJS.Timer;
    // region Timer signals
    const [timerValueMs, setTimerValueMs] = createSignal(0);
    // Length of the timer (it resets only when timer ends or restarted)
    // (Initial value is 1 used to avoid division by 0 in the effect below)
    const [initialTimerDurationMs, setInitialTimerDurationMs] = createSignal(1);
    // Used as a parameter for
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
        setIsPauseFrontend(value);
        // Play/start icon was pressed
        if (!value) {
            // Step 1. Check if this is a new timer (not an ongoing one)
            // Note: This is also works if timer was paused and its values were overwritten
            if (initialTimerDurationMs() !== timerValueMs()) {
                // Step 2.1 if it is, create a timer
                setInitialTimerDurationMs(timerValueMs());
                SendChromeMessage(new Pomodoro.Message.CreateTimer(timerValueMs()))
                    .then((response) => {
                        // Handling possible error from messaging system
                        if (!response.isOk) {
                            Unreachable(response.error.message);
                        }
                    });
            }
            else {
                // Step 2.2 If it's not, unpause existing timer
                SendChromeMessage<Pomodoro.Message.UnpauseResponse>(new Pomodoro.Message.Unpause())
                    .then((response) => {
                        // Handling possible error from the messaging system
                        if (!response.isOk) {
                            Unreachable(response.error.message);
                        } else {
                            const result = response.value;
                            // Handling possible error from the API
                            if (!result.isOk) {
                                Unreachable(response.error.message);
                            }
                        }
                    });
            }
            timerTickInterval = setInterval(OneSecondTick, 1000);
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
            return;
        }
        setTimerValueMs(newMsValue);
    }

    // Loading the latest timer info
    SendChromeMessage<Pomodoro.Message.GetTimerResponse>(new Pomodoro.Message.GetTimer())
        .then((response) => {
            // Handling possible error from the messaging system
            if (!response.isOk) {
                Unreachable(response.error.message);
                return;
            }
            // Response value is a promise, so need to wait for result as well
            Promise.resolve(response.value)
                .then((timerInfo) => {
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
        });

    return <>
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
    </>
}
// Mini form for changing pomodoro info
function PomodoroForm() {
    // TODO: use solid-js built-in lazy?
    // Connecting to existing storage signal to sync with pomodoro info on the backend
    var [pomodoroInfo, __pomodoroInfoSetter] = createSignal<PomodoroInfo>();
    connectToStorageSignalAsync<PomodoroInfo>(POMODORO_INFO_STORAGE_NAME).then((storageGetter) => {
        pomodoroInfo = storageGetter;
        __pomodoroInfoSetter(storageGetter());
        // Updating derived signals
        workSessionMs = () => pomodoroInfo().workSessionDurationMs;
        workSessionDurationInput.valueAsNumber = workSessionMs();
    });
    // region Work session input
    // Signal for value in work session time
    var [workSessionMs, __setWorkSessionMs] = createSignal(0);
    // TODO: continue. step thing doesn't work. Signals stuff looks weird
    const workSessionDurationInput = <input class="time-input z-10" step="3600" type="time" /> as HTMLInputElement;
    // endregion

    return <>
        <div class="flex flex-col space-y-2.5">
            <h1 class="text-3xl font-medium">Pomodoro details</h1>
            <div class="form-control text-base font-medium">
                <label class="label">
                    <span class="label-text text-lg font-medium">Work session in hh:mm</span>
                </label>
                <label class="input-group input-group-md" >
                    {workSessionDurationInput}
                </label>
            </div>
        </div>
    </>
}
// Switch like indicator displaying current pomodoro state: work/rest
function PomodoroIndicator() {
    // Connecting to existing storage signal to sync with pomodoro info in the background
    var [storagePomodoroInfo, __setPomodoroInfo] = createSignal<PomodoroInfo>({
        // Will be overwritten later with the actual values from storage
        isWorkingSession: true,
        workSessionDurationMs: 0,
        breakDurationMs: 0,
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
                        <FaSolidBusinessTime size={48} class="text-secondary" />
                        <span class="text-base-content text-lg">Work</span>
                    </div>
                </div>
                <div class="swap-off">
                    <div class="flex flex-col justify-center">
                        <FaSolidUserClock size={48} class="text-secondary" />
                        <span class="text-base-content text-lg">Rest</span>
                    </div>
                </div>
            </label>
        </div>
    </>
}

export default function PomodoroRoot() {
    return <>
        <div class="flex justify-around p-2">
            <div class="flex flex-col space-y-5 justify-center">
                <Timer />
                <PomodoroIndicator />
            </div>
            <PomodoroForm />
        </div>
    </>
}