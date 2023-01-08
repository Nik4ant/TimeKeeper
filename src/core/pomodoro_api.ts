import {createStorageSignalAsync} from "../utils/storage_manager";
import {ErrorType, Maybe} from "../utils/custom_error";
import {MessageBasedApi, MessageType} from "../utils/message_api";

/*
Quote from docs: "...setting delayInMinutes or periodInMinutes to less than 1 will not be honored and will cause
a warning. when can be set to less than 1 minute after "now" without warning but won't actually cause the alarm to
fire for at least 1 minute". Source: https://developer.chrome.com/docs/extensions/reference/alarms/#method-create

TODO: finish explanation of the trick used here
*/

//region Timer info
type TimerInfo = {
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
const [timerInfoStorage, setTimerInfoStorage] = await createStorageSignalAsync<TimerInfo>(TIMER_INFO_STORAGE_NAME, DEFAULT_TIMER_INFO);
// endregion
//region PomodoroInfo
type PomodoroInfo = {
    workingSessionDurationMs: number,
    breakDurationMs: number,
    longBreakDurationMs: number,
    // True if last active timer was used as a timer for work session
    isWorkingSession: boolean,
}
const DEFAULT_POMODORO_INFO: PomodoroInfo = {
    workingSessionDurationMs: 45,
    breakDurationMs: 15,
    longBreakDurationMs: 25,
    isWorkingSession: true,
}
const POMODORO_INFO_STORAGE_NAME = "TimeKeeperPomodoroInfo";
const [pomodoroInfoStorage, setPomodoroInfoStorage] = await createStorageSignalAsync<PomodoroInfo>(POMODORO_INFO_STORAGE_NAME, DEFAULT_POMODORO_INFO);
//endregion

export namespace Pomodoro {
    class UnpauseRunningTimerError implements ErrorType {
        message: string;

        constructor() {
            this.message = "Unreachable error! Can't unpause running timer";
        }
    }
    class UnexpectedAlarmError implements ErrorType {
        message: string;

        constructor(message: string) {
            this.message = message;
        }
    }

    // Types and containers for messaging system
    export namespace Message {
        export class Pause extends MessageType {
            override readonly isAsync = true;
            // Note: Again fighting with the fact the interface can't have static values
            static readonly NAME = "PomodoroMessagePause";
            messageName: string;
            toReceiver: string;

            constructor() {
                super(Api.MESSAGE_RECEIVER_NAME);
                this.messageName = Pause.NAME;
            }

        }
        export type PauseResponse = Promise<Maybe<UnexpectedAlarmError>>;

        export class Unpause extends MessageType {
            // Note: Again fighting with the fact the interface can't have static values
            static readonly NAME = "PomodoroMessageUnpause";
            messageName: string;
            toReceiver: string;

            constructor() {
                super(Api.MESSAGE_RECEIVER_NAME);
                this.messageName = Unpause.NAME;
            }
        }
        export type UnpauseResponse = Maybe<UnpauseRunningTimerError>;

        export class CreateTimer extends MessageType {
            // Note: Again fighting with the fact the interface can't have static values
            static readonly NAME = "PomodoroMessageCreateTimer";
            messageName: string;
            toReceiver: string;

            timerDurationMs: number;
            constructor(timerDurationMs: number) {
                super(Api.MESSAGE_RECEIVER_NAME);
                this.messageName = CreateTimer.NAME;
                this.timerDurationMs = timerDurationMs;
            }
        }

        export class GetTimer extends MessageType {
            override readonly isAsync = true;
            // Note: Again fighting with the fact the interface can't have static values
            static readonly NAME = "PomodoroMessageGetTimer";
            messageName: string;
            toReceiver: string;

            constructor() {
                super(Api.MESSAGE_RECEIVER_NAME);
                this.toReceiver = Api.MESSAGE_RECEIVER_NAME;
                this.messageName = GetTimer.NAME;
            }
        }
        export type GetTimerResponse = Promise<TimerInfo>;

        export class SetInfo extends MessageType {
            // Note: Again fighting with the fact the interface can't have static values
            static readonly NAME = "PomodoroMessageSetInfo";
            messageName: string;
            toReceiver: string;

            newInfo: PomodoroInfo;
            constructor(workingSessionDurationMs: number, breakDurationMs: number, longBreakDurationMs: number,
                        isWorkingSession?: boolean) {
                super(Api.MESSAGE_RECEIVER_NAME);
                this.messageName = SetInfo.NAME;

                this.newInfo = {
                    workingSessionDurationMs: workingSessionDurationMs,
                    breakDurationMs: breakDurationMs,
                    longBreakDurationMs: longBreakDurationMs,
                    // If isWorkingSession parameter wasn't specified using value from storage
                    isWorkingSession: isWorkingSession === undefined ? pomodoroInfoStorage().isWorkingSession : isWorkingSession
                }
            }
        }

        export class GetInfo extends MessageType {
            // Note: Again fighting with the fact the interface can't have static values
            static readonly NAME = "PomodoroMessageGetInfo";
            messageName: string;
            toReceiver: string;

            constructor() {
                super(Api.MESSAGE_RECEIVER_NAME);
                this.messageName = GetInfo.NAME;
            }
        }
        export type GetInfoResponse = PomodoroInfo;
    }
    // Api that handles new messages and contains pomodoro api logic
    export class Api extends MessageBasedApi {
        public static override readonly MESSAGE_RECEIVER_NAME = "PomodoroApiReceiver";
        private static readonly POMODORO_CHROME_ALARM_NAME = "TimeKeeperPomodoroAlarm";

        static override OnNewMessageReceived(message): Message.PauseResponse | Message.UnpauseResponse | Message.GetTimerResponse | Message.GetInfoResponse | void {
            // Note: There is no better way to check message type (trust me, I've tried...)
            // TODO: use switch

            // FIXME: error occurs because runtime.sendMessage doesn't work too well with promises
            console.log(message.messageName, message.toReceiver);
            if (message.messageName === Message.Pause.NAME) {
                return Api.Pause();
            }
            else if (message.messageName === Message.Unpause.NAME) {
                return Api.Unpause();
            }
            else if (message.messageName === Message.CreateTimer.NAME) {
                return Api.CreateTimer((message as Message.CreateTimer).timerDurationMs);
            }
            else if (message.messageName === Message.GetTimer.NAME) {
                return Api.GetLatestTimer();
            }
            else if (message.messageName === Message.SetInfo.NAME) {
                return Api.SetInfo((message as Message.SetInfo).newInfo);
            }
            else if (message.messageName === Message.GetInfo.NAME) {
                return Api.GetInfo();
            }
            else {
                console.error(`Unpredictable error! Unexpected message "${message}" to receiver "${Api.MESSAGE_RECEIVER_NAME}"`);
            }
        }

        public static override _InitForBackground() {
            super._InitForBackground();  // base class init for messaging system
            chrome.alarms.onAlarm.addListener(Api.OnChromeAlarm);
        }

        private static OnChromeAlarm(alarm: chrome.alarms.Alarm): void {
            // Check if alarm is related to pomodoro
            if (alarm.name === Api.POMODORO_CHROME_ALARM_NAME) {
                // Resetting timer
                setTimerInfoStorage(DEFAULT_TIMER_INFO);
                // "Alarm"
                console.log("ALARM ENDED! BIP-BOP; BIP-BOP...");
            }
        }

        private static async GetLatestTimer(): Promise<TimerInfo> {
            const lastChromeAlarm: chrome.alarms.Alarm | undefined = await chrome.alarms.get(Api.POMODORO_CHROME_ALARM_NAME);
            // Check if there is any running alarm
            console.log("Chrome alarm: ", lastChromeAlarm);
            if (lastChromeAlarm === undefined) {
                console.log("Returning storage value: ", timerInfoStorage());
                // If no, return the latest one from storage
                return timerInfoStorage();
            }
            // If yes calculate how much time left and format that into timer info.
            // Note: Value in storage doesn't have the latest time, but all other info is 100% correct
            const timerInfo = timerInfoStorage();
            const newInfo = {
                isPaused: false,  // if chrome alarm exists than timer is currently running
                timeLeftMs:  lastChromeAlarm.scheduledTime - Date.now(),
                durationMs: timerInfo.durationMs,
                startTimeDate: timerInfo.startTimeDate,
                lastPauseDate: timerInfo.lastPauseDate
            }
            // Save that info to storage as well
            setTimerInfoStorage(newInfo);
            return newInfo;
        }

        // Starts background timer and updates storage info
        private static CreateTimer(timerDurationMs: number): void {
            // Step 1. Start a chrome alarm that will be processed in the background
            chrome.alarms.create(Api.POMODORO_CHROME_ALARM_NAME, {
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
            setTimerInfoStorage(pomodoroTimerInfo);
        }

        // Pauses currently running timer
        private static async Pause(): Promise<Maybe<UnexpectedAlarmError>> {
            const chromeAlarm = await chrome.alarms.get(Api.POMODORO_CHROME_ALARM_NAME);
            // In reality end user can't pause timer that doesn't exist, but for some reason
            // error can appear here (most likely error during development)
            if (chromeAlarm === undefined) {
                return Maybe.Err(new UnexpectedAlarmError("Unreachable error! Can't pause not existing timer"));
            }
            // Step 1. Update timer info in storage to reuse it later (when timer is resumed)
            var timerInfo = timerInfoStorage();
            timerInfo.isPaused = true;
            timerInfo.lastPauseDate = Date.now();
            timerInfo.timeLeftMs = chromeAlarm.scheduledTime - Date.now();
            setTimerInfoStorage(timerInfo);
            // Step 2. Clear background alarm
            const wasAlarmCleared = await chrome.alarms.clear(Api.POMODORO_CHROME_ALARM_NAME);
            if (!wasAlarmCleared) {
                return Maybe.Err(new UnexpectedAlarmError("Unreachable error! Can't clear chrome alarm to pause timer"));
            }
            return Maybe.Ok();
        }

        // Unpauses most recent timer
        private static Unpause(): Maybe<UnpauseRunningTimerError> {
            // Check if there is any alarm to pause
            var timerInfo = timerInfoStorage()
            if (!timerInfo.isPaused) {
                return Maybe.Err(new UnpauseRunningTimerError());
            }
            // Step 1. Calculate when "new" background alarm needs to fire
            const totalMsLeft = timerInfo.durationMs - (timerInfo.lastPauseDate - timerInfo.startTimeDate)
            chrome.alarms.create(Api.POMODORO_CHROME_ALARM_NAME, {
                when: new Date().setMilliseconds(totalMsLeft),
            });
            // Step 2. Update values
            timerInfo.isPaused = false;
            timerInfo.timeLeftMs = totalMsLeft;
            // Step 3. Save changes to storage
            setTimerInfoStorage(timerInfo);

            return Maybe.Ok();
        }

        // Note: Separate get and set methods exist only to avoid having API related logic
        // inside messages handler. Otherwise, that would be useless
        private static GetInfo(): PomodoroInfo {
            return pomodoroInfoStorage();
        }
        private static SetInfo(newInfo: PomodoroInfo): void {
            setPomodoroInfoStorage(newInfo);
        }
    }
}