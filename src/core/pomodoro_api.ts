import {createStorageSignalAsync} from "../utils/storage_manager";
import {ErrorType, Maybe} from "../utils/custom_error";

/*
Quote from docs: "...setting delayInMinutes or periodInMinutes to less than 1 will not be honored and will cause
a warning. when can be set to less than 1 minute after "now" without warning but won't actually cause the alarm to
fire for at least 1 minute". Source: https://developer.chrome.com/docs/extensions/reference/alarms/#method-create


*/

export type TimerInfo = {
    isPaused: boolean,
    durationMs: number,
    timeLeftMs: number,
    startTimeDate: number,
    lastPauseDate: number,  // last time when pause was triggered
}
const DEFAULT_TIMER_INFO: TimerInfo = {
    isPaused: true,
    durationMs: 0,
    timeLeftMs: 0,
    startTimeDate: 0,
    lastPauseDate: 0,
}

export const TIMER_INFO_STORAGE_NAME = "TimeKeeperPomodoroTimer";
let [timerStorageInfoGetter, timerStorageInfoSetter] = await createStorageSignalAsync(TIMER_INFO_STORAGE_NAME, DEFAULT_TIMER_INFO);


class UnpauseRunningTimerError implements ErrorType {
    message: string;

    constructor() {
        this.message = "Unreachable error! Can't unpause running timer";
    }
}
class UnexpectedAlarmError implements ErrorType {
    message: string;

    constructor() {
        this.message = "Unreachable error! Can't clear chrome alarm to pause timer";
    }
}

export namespace PomodoroApi {
    const POMODORO_CHROME_ALARM_NAME = "TimeKeeperPomodoroAlarm";

    // Used to set up alarm event listener during background startup
    export function _InitForBackground() {
        chrome.alarms.onAlarm.addListener(OnChromeAlarm);
    }

    function OnChromeAlarm(alarm: chrome.alarms.Alarm): void {
        // Check if alarm is related to pomodoro
        if (alarm.name === POMODORO_CHROME_ALARM_NAME) {
            // Resetting timer
            timerStorageInfoSetter(DEFAULT_TIMER_INFO);
            // "Alarm"
            console.log("ALARM ENDED! BIP-BOP; BIP-BOP...");
        }
    }

    export async function GetLatestTimer(): Promise<TimerInfo> {
        const lastChromeAlarm: chrome.alarms.Alarm | undefined = await chrome.alarms.get(POMODORO_CHROME_ALARM_NAME);
        // Check if there is any running alarm
        if (lastChromeAlarm === undefined) {
            // If no, return the latest one from storage
            return timerStorageInfoGetter();
        }
        // If yes calculate how much time left and format that into timer info.
        // Note: Value in storage doesn't have the latest time, but all other info is 100% correct
        const timerInfoStorage = timerStorageInfoGetter();
        const newInfo = {
            isPaused: false,  // if chrome alarm exists than timer is currently running
            timeLeftMs:  lastChromeAlarm.scheduledTime - Date.now(),
            durationMs: timerInfoStorage.durationMs,
            startTimeDate: timerInfoStorage.startTimeDate,
            lastPauseDate: timerInfoStorage.lastPauseDate
        }
        // Save that info to storage as well
        timerStorageInfoSetter(newInfo);
        return newInfo;
    }

    // Starts background timer and updates storage info
    export function CreateTimer(timerDurationMs: number): void {
        // Step 1. Start a chrome alarm that will be processed in the background
        chrome.alarms.create(POMODORO_CHROME_ALARM_NAME, {
            when: new Date().setMilliseconds(timerDurationMs),
        });
        // Step 2. Create timer info and update storage value
        const pomodoroTimerInfo: TimerInfo = {
            isPaused: false,
            startTimeDate: Date.now(),
            durationMs: timerDurationMs,
            timeLeftMs: timerDurationMs,
            lastPauseDate: 0,
        }
        timerStorageInfoSetter(pomodoroTimerInfo);
    }

    // Pauses currently running timer
    export async function Pause(): Promise<Maybe<UnexpectedAlarmError>> {
        // FIXME: Pause is now broken for some reason...It can't get alarm...
        //  Or does it? (at this point code just fixes and breaks itself sometimes)
        // Step 1. Update timer info in storage to reuse it later (when timer is resumed)
        const chromeAlarm = await chrome.alarms.get(POMODORO_CHROME_ALARM_NAME);
        var timerInfo = timerStorageInfoGetter();
        timerInfo.isPaused = true;
        timerInfo.lastPauseDate = Date.now();
        timerInfo.timeLeftMs = chromeAlarm.scheduledTime - Date.now();
        timerStorageInfoSetter(timerInfo);
        // Step 2. Clear background alarm
        const wasAlarmCleared = await chrome.alarms.clear(POMODORO_CHROME_ALARM_NAME);
        if (!wasAlarmCleared) {
            return Maybe.Err(new UnexpectedAlarmError());
        }
        return Maybe.Ok();
    }

    // Unpauses most recent timer
    export function Unpause(): Maybe<UnpauseRunningTimerError> {
        // Check if there is any alarm to pause
        var timerInfo = timerStorageInfoGetter()
        if (!timerInfo.isPaused) {
            return Maybe.Err(new UnpauseRunningTimerError());
        }
        // Step 1. Calculate when "new" background alarm needs to fire
        const totalMsLeft = timerInfo.durationMs - (timerInfo.lastPauseDate - timerInfo.startTimeDate)
        chrome.alarms.create(POMODORO_CHROME_ALARM_NAME, {
           when: new Date().setMilliseconds(totalMsLeft),
        });
        // Step 2. Update values
        timerInfo.isPaused = false;
        timerInfo.timeLeftMs = totalMsLeft;
        // Step 3. Save changes to storage
        timerStorageInfoSetter(timerInfo);

        return Maybe.Ok();
    }
}