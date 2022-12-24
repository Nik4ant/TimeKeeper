import {createSignal} from "solid-js";
import { AiOutlinePauseCircle, AiOutlinePlayCircle } from 'solid-icons/ai';
import {PomodoroApi} from "../../../../core/pomodoro_api";
import "./pomodoro.css";


// TODO 2: Disable "spin" animation onload (apply it only for countdown)
// TODO 3: Wouldn't be cool to have round slider to set time? (like real world once)
// TODO 4: Post final timer result in Discord after everything is working
// TODO: setup validation and stuff like that later
function Timer() {
    // Interval is used to update only fronted timer
    // (During initial load there is no timer)
    let timerTickInterval: NodeJS.Timer;
    // region Timer signals
    // Used for countdown
    const [currentSeconds, setCurrentSeconds] = createSignal(0);
    const [currentMinutes, setCurrentMinutes] = createSignal(0);
    const [currentHours, setCurrentHours] = createSignal(0);
    // Time left represented in Ms
    const currentTotalMs = () => currentSeconds() * 1000 + currentMinutes() * 60 * 1000 + currentHours() * 3600 * 1000;
    // Only indicates pause for frontend elements. Changes in background code occur only if specific API was called
    const [isPauseFronted, setIsPauseFrontend] = createSignal(true);
    // endregion

    function HandlePauseValueChanged(value): void {
        // Ignore pause change if timer values are zero
        if (currentTotalMs() === 0) {
            // FIXME: WHY THIS DOESN'T WORK?!?!
            setIsPauseFrontend(!value);  // reset fronted value back
            return;
        }

        setIsPauseFrontend(value);
        // If not pause starting the timer again
        if (!value) {
            timerTickInterval = setInterval(OneSecondTick, 1000);
            PomodoroApi.Unpause()
        }
        else {
            clearInterval(timerTickInterval);
            PomodoroApi.Pause().then(_ => _);
        }
    }
    // Updates signal values for seconds, minutes and hours based on given time in Ms
    function SetTimeFromMs(timeMs: number): void {
        const totalSecondsLeft = timeMs / 1000;
        setCurrentHours(Math.floor(totalSecondsLeft / 3600));
        setCurrentMinutes(Math.floor(totalSecondsLeft / 60) % 60);
        setCurrentSeconds(Math.floor(totalSecondsLeft) % 60);
    }
    function CreateTimer(timerDurationMs: number): void {
        PomodoroApi.CreateTimer(timerDurationMs);

        setIsPauseFrontend(false);
        SetTimeFromMs(timerDurationMs);

        timerTickInterval = setInterval(OneSecondTick, 1000);
    }
    function OneSecondTick() {
        // 0 seconds --> reduce minutes and set seconds back to 60
        if (currentSeconds() === 0) {
            // 0 seconds --> 0 minutes --> reduce hours and set minutes back to 60
            if (currentMinutes() === 0) {
                // 0 seconds --> 0 minutes --> 0 hours --> end
                if (currentHours() === 0) {
                    alert("Frontend timer end");
                    clearInterval(timerTickInterval);
                    setIsPauseFrontend(true);
                    return;
                }
                setCurrentHours(currentHours() - 1);
                setCurrentMinutes(60);
            }
            setCurrentMinutes(currentMinutes() - 1);
            setCurrentSeconds(60);
        }
        setCurrentSeconds(currentSeconds() - 1);
    }

    // Loading the latest timer info
    PomodoroApi.GetLatestTimer().then((timerInfo) => {
        // 1) Set values for visual elements
        setIsPauseFrontend(timerInfo.isPaused);  // 1.1) Pause
        SetTimeFromMs(timerInfo.timeLeftMs);  // 1.2) Time left
        // 2) If there is ongoing timer in the background starting interval immediately
        if (!timerInfo.isPaused)
            timerTickInterval = setInterval(OneSecondTick, 1000);
    });

    return <>
        <div class="radial-progress text-primary" style={{"--value": 42/*currentTotalMs() * 100 / timerInitialDurationMs()*/,
            "--thickness": "4px", "--size": "14rem"}}>
            <div class="flex flex-col justify-center">
                <div class="flex gap-5 text-base-content">
                    <div class="countdown-container">
                        <span class="countdown-container-value"><span style={{"--value": currentHours()}}></span></span>
                        hours
                    </div>
                    <div class="countdown-container">
                        <span class="countdown-container-value"><span style={{"--value": currentMinutes()}}></span></span>
                        min
                    </div>
                    <div class="countdown-container">
                        <span class="countdown-container-value"><span style={{"--value": currentSeconds()}}></span></span>
                        sec
                    </div>
                </div>
                <div class="absolute bottom-5 left-1/2 right-1/2 flex justify-center">
                    <label class="h-1/2 swap swap-rotate text-secondary">
                        <input type="checkbox" checked={isPauseFronted()}
                               onClick={() => HandlePauseValueChanged(!isPauseFronted())} />
                        <AiOutlinePauseCircle class="swap-off fill-current" size={48} />
                        <AiOutlinePlayCircle class="swap-on fill-current" size={48} />
                    </label>
                </div>
            </div>
        </div>
        <button onClick={() => CreateTimer(2 * 60 * 1000)} class="btn btn-accent">SET TIMER (TEMP)</button>
    </>
}

export default function PomodoroRoot() {
    return <>
        <div class="flex justify-center p-2">
            <Timer />
        </div>
    </>
}