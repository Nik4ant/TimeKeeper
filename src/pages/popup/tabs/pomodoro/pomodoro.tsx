import {createSignal} from "solid-js"
import { AiOutlinePauseCircle, AiOutlinePlayCircle } from 'solid-icons/ai';
import {PomodoroApi} from "../../../../core/pomodoro_api";
import "./pomodoro.css";


// TODO 1: Desync between background and frontend is approximately 3-4 seconds (Sending message to the background might fix this?)
// Note: But sometimes there is no desync. Did the issue solve itself...?

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
    // Initial duration time is used to calculate how much time passed
    // TODO: finish this thing
    const [timerInitialDurationMs, setTimerInitialDurationMs] = createSignal(0);
    // Time left represented in Ms
    const currentTotalMs = () => currentSeconds() * 1000 + currentMinutes() * 60 * 1000 + currentHours() * 3600 * 1000;
    // Only indicates pause for frontend elements. Changes in background code occur only if specific API was called
    const [isPauseFronted, setIsPauseFrontend] = createSignal(true);
    // endregion

    function HandlePauseValueChanged(value): void {
        // If not pause starting the timer again
        if (!value) {
            timerTickInterval = setInterval(OneSecondTick, 1000);
            PomodoroApi.UnpauseCurrentTimer().then(_ => _);
        } else {
            clearInterval(timerTickInterval);
            PomodoroApi.PauseCurrentTimer().then(_ => _);
        }
    }
    // Function for notifying both frontend and background
    function OnFrontendPauseValueChanged(value) {
        setIsPauseFrontend(value);
        HandlePauseValueChanged(value);
    }
    function SetBackgroundTimer(totalTimeMs: number) {
        var pomodoroTimerInfo = PomodoroApi.SetTimer(totalTimeMs);
        // Set value to frontend time
        setCurrentSeconds(pomodoroTimerInfo.secondsLeft);
        setCurrentMinutes(pomodoroTimerInfo.minutesLeft);
        setCurrentHours(pomodoroTimerInfo.hoursLeft);
        setIsPauseFrontend(false);
        setTimerInitialDurationMs(currentTotalMs());
        timerTickInterval = setInterval(OneSecondTick, 1000);  // starting the timer
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
                    return;
                }
                setCurrentHours(currentHours() - 1);
                setCurrentMinutes(60);
            }
            setCurrentMinutes(currentMinutes() - 1)
            setCurrentSeconds(60);
        }
        setCurrentSeconds(currentSeconds() - 1);
    }

    // Loading latest timer info from background page to popup
    PomodoroApi.GetLatestTimer().then((timerInfo) => {
        setCurrentSeconds(timerInfo.secondsLeft);
        setCurrentMinutes(timerInfo.minutesLeft);
        setCurrentHours(timerInfo.hoursLeft);
        // If there is ongoing timer starting interval immediately
        setIsPauseFrontend(timerInfo.isPaused);
        if (!timerInfo.isPaused) {
            timerTickInterval = setInterval(OneSecondTick, 1000);
        }
    });

    return <>
        <div class="radial-progress text-primary" style={{"--value": 100/*currentTotalMs() * 100 / timerInitialDurationMs()*/,
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
                               onClick={() => OnFrontendPauseValueChanged(!isPauseFronted())} />
                        <AiOutlinePauseCircle class="swap-off fill-current" size={48} />
                        <AiOutlinePlayCircle class="swap-on fill-current" size={48} />
                    </label>
                </div>
            </div>
        </div>
        <button onClick={() => SetBackgroundTimer(2 * 60 * 1000)} class="btn btn-accent">SET TIMER (TEMP)</button>
    </>
}

export default function PomodoroRoot() {
    return <>
        <div class="flex justify-center p-2">
            <Timer />
        </div>
    </>
}