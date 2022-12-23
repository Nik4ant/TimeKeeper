import {createStorageSignalAsync} from "../utils/storage_manager";

/*
Quote from docs: "...setting delayInMinutes or periodInMinutes to less than 1 will not be honored and will cause
a warning. when can be set to less than 1 minute after "now" without warning but won't actually cause the alarm to
fire for at least 1 minute". Source: https://developer.chrome.com/docs/extensions/reference/alarms/#method-create


*/

type PomodoroInfo = {
    isPaused: boolean,
    hoursLeft: number,
    minutesLeft: number,
    secondsLeft: number,
}
const DEFAULT_POMODORO_INFO: PomodoroInfo = {
    isPaused: true,
    hoursLeft: 0,
    minutesLeft: 0,
    secondsLeft: 0,
}

const POMODORO_INFO_STORAGE_NAME = "TimeKeeperPomodoroTimer"
let [pomodoroStorageInfoGetter, pomodoroStorageInfoSetter] = await createStorageSignalAsync(POMODORO_INFO_STORAGE_NAME, DEFAULT_POMODORO_INFO);

export namespace PomodoroApi {
    const POMODORO_CHROME_ALARM_NAME = "TimeKeeperPomodoroAlarm"

    // Used to set up alarm event listener during background startup
    export function _Init() {
        chrome.alarms.onAlarm.addListener(OnChromeAlarm);
    }

    function OnChromeAlarm(alarm: chrome.alarms.Alarm): void {
        // Check if alarm is related to pomodoro
        if (alarm.name === POMODORO_CHROME_ALARM_NAME) {
            // Resetting timer
            pomodoroStorageInfoSetter(DEFAULT_POMODORO_INFO);
            // "Alarm"
            console.log("ALARM ENDED! BIP-BOP; BIP-BOP...")
        }
    }

    function MsToPomodoroInfo(totalMsLeft: number, isPaused: boolean): PomodoroInfo {
        var totalSecondsLeft = totalMsLeft / 1000;
        return {
            isPaused: isPaused,
            hoursLeft: Math.floor(totalSecondsLeft / 3600),
            minutesLeft: Math.floor(totalSecondsLeft / 60) % 60,
            secondsLeft: Math.floor(totalSecondsLeft) % 60,
        }
    }

    // Updates storage value with new info or with time left before current alarm goes off
    export async function UpdateStorageInfo(isTimerPaused: boolean, newTimerInfo?: PomodoroInfo): Promise<void> {
        // Using alarm to see the difference
        if (newTimerInfo === undefined) {
            var alarm = await chrome.alarms.get(POMODORO_CHROME_ALARM_NAME);
            if (alarm === undefined) {
                // ignoring for now... TODO: error
                console.log("ERROR! Can't find the alarm");
                return;
            }
            pomodoroStorageInfoSetter(MsToPomodoroInfo(alarm.scheduledTime - Date.now(), isTimerPaused));
        }
        else {
            pomodoroStorageInfoSetter(newTimerInfo);
        }
    }

    export function SetTimer(totalTimeMs: number): PomodoroInfo {
        var result = MsToPomodoroInfo(totalTimeMs, false);
        // Creating alarm and saving info to storage
        chrome.alarms.create(POMODORO_CHROME_ALARM_NAME, {when: new Date().setMilliseconds(totalTimeMs)});
        pomodoroStorageInfoSetter(result);
        return result;
    }

    export async function PauseCurrentTimer() {
        // Updating storage info before clearing alarm
        // FIXME: this is dumb
        await UpdateStorageInfo(true);
        await chrome.alarms.clear(POMODORO_CHROME_ALARM_NAME);
    }

    export async function UnpauseCurrentTimer() {
        // Restarting most recent alarm
        var pomodoroInfo = await GetLatestTimer();
        SetTimer(pomodoroInfo.hoursLeft * 60 * 60 * 1000 + pomodoroInfo.minutesLeft * 60 * 1000 + pomodoroInfo.secondsLeft * 1000);
    }

    // Returns info about currently working timer if there is any.
    // Otherwise, returns the latest info from storage
    export async function GetLatestTimer(): Promise<PomodoroInfo> {
        var lastChromeAlarm: chrome.alarms.Alarm | undefined = await chrome.alarms.get(POMODORO_CHROME_ALARM_NAME);
        // Check if there is any running alarm
        if (lastChromeAlarm === undefined) {
            // If no, return the latest one from storage
            return pomodoroStorageInfoGetter();
        }
        // If yes calculate how much time left and format that into pomodoro info.
        // Note: Value in storage doesn't have the latest time, but info about pause is 100% correct
        return MsToPomodoroInfo(lastChromeAlarm.scheduledTime - Date.now(), pomodoroStorageInfoGetter().isPaused);
    }
}