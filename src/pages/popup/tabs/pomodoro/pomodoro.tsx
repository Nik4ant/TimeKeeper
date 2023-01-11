import {createSignal, Accessor, Setter, Component, Show} from "solid-js";
import {AiOutlinePauseCircle, AiOutlinePlayCircle} from 'solid-icons/ai';
import "./pomodoro.css";
import {Pomodoro} from "../../../../core/pomodoro_api";
import {Unreachable} from "../../../../utils/custom_error";
import {SendChromeMessage} from "../../../../utils/message_api";


// Note: Having separate interface feels dumb, but there is no better way to specify type
interface TimerEditableDisplayProps {
    isPauseFronted: Accessor<boolean>,
    timerValueMs: Accessor<number>,
    setTimerValueMs: Setter<number>
}
const TimerEditableDisplay: Component<TimerEditableDisplayProps> = ({isPauseFronted, timerValueMs, setTimerValueMs}) => {
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
            if (initialTimerDurationMs() < timerValueMs()) {
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
                <TimerEditableDisplay isPauseFronted={isPauseFronted} timerValueMs={timerValueMs} setTimerValueMs={setTimerValueMs} />
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

function PomodoroForm() {
    return <>
        <h1 class="text-lg">Yet to be implemented</h1>
    </>
}

export default function PomodoroRoot() {
    return <>
        <div class="flex justify-center p-2">
            <Timer />
            <PomodoroForm />
        </div>
    </>
}