import {createStorageSignalAsync} from "../utils/storage_manager";
import {ErrorType, Maybe} from "../utils/custom_error";
import {MessageBasedApi, MessageType} from "../utils/message_api";

/*
Very important explanation on how the whole timer system works:

chrome.alarms is an api for making periodic stuff, and it has one serious limitation.
Quote from docs: "...setting delayInMinutes or periodInMinutes to less than 1 will not be honored and will cause
a warning. when [when is parameter for setting UNIX time] can be set to less than 1 minute after "now" without warning but won't actually cause the alarm to
fire for at least 1 minute". Source: https://developer.chrome.com/docs/extensions/reference/alarms/#method-create

TODO: test if 1 second timer actually works on end user machine (because it might work only because of dev mode)
In order to make timer with 1 second precession following trick was used...
When user creates a timer alarm is set
*/

//region
export type PomodoroInfo = {
    workSessionDurationMs: number,
    breakDurationMs: number,
    // True if last active timer was used as a timer for work session
    isWorkingSession: boolean,
}
const DEFAULT_POMODORO_INFO: PomodoroInfo = {
    workSessionDurationMs: 45 * 60 * 1000,
    breakDurationMs: 15 * 60 * 1000,
    isWorkingSession: true,
}
export const POMODORO_INFO_STORAGE_NAME = "TimeKeeperPomodoroInfo";
const [pomodoroInfoStorage, setPomodoroInfoStorage] = await createStorageSignalAsync<PomodoroInfo>(POMODORO_INFO_STORAGE_NAME, DEFAULT_POMODORO_INFO);
//endregion
//region Timer info
export type TimerInfo = {
    isPaused: boolean,
    durationMs: number,
    timeLeftMs: number,
    startTimeDate: number,
    lastPauseDate: number,  // last time when pause was triggered
}
const DEFAULT_TIMER_INFO: TimerInfo = {
    isPaused: true,
    durationMs: DEFAULT_POMODORO_INFO.workSessionDurationMs,
    timeLeftMs: DEFAULT_POMODORO_INFO.workSessionDurationMs,
    startTimeDate: 0,
    lastPauseDate: 0,
}

const TIMER_INFO_STORAGE_NAME = "TimeKeeperPomodoroTimer";
const [timerInfoStorage, setTimerInfoStorage] = await createStorageSignalAsync<TimerInfo>(TIMER_INFO_STORAGE_NAME, DEFAULT_TIMER_INFO);
// endregion

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

            workSessionDurationMs: number;
            breakDurationMs: number;
            isWorkingSession: boolean;
            constructor(workingSessionDurationMs: number, breakDurationMs: number, isWorkingSession?: boolean) {
                super(Api.MESSAGE_RECEIVER_NAME);
                this.messageName = SetInfo.NAME;
                this.workSessionDurationMs = workingSessionDurationMs;
                this.breakDurationMs = breakDurationMs;
                // If isWorkingSession parameter wasn't specified using value from storage
                this.isWorkingSession = isWorkingSession === undefined ? pomodoroInfoStorage().isWorkingSession : isWorkingSession;
            }
        }
    }
    // Api that handles new messages and contains pomodoro api logic
    export class Api extends MessageBasedApi {
        public static override readonly MESSAGE_RECEIVER_NAME = "PomodoroApiReceiver";
        private static readonly POMODORO_CHROME_ALARM_NAME = "TimeKeeperPomodoroAlarm";

        static override OnNewMessageReceived(message): Message.PauseResponse | Message.UnpauseResponse | Message.GetTimerResponse | void {
            switch (message.messageName) {
                case Message.Pause.NAME:
                    return Api.Pause();
                case Message.Unpause.NAME:
                    return Api.Unpause();
                case Message.CreateTimer.NAME:
                    return Api.CreateTimer((message as Message.CreateTimer).timerDurationMs);
                case Message.GetTimer.NAME:
                    return Api.GetLatestTimer();
                case Message.SetInfo.NAME:
                    const infoMessage = message as Message.SetInfo;
                    return Api.SetInfo(infoMessage.workSessionDurationMs, infoMessage.breakDurationMs, infoMessage.isWorkingSession);
                default:
                    console.error(`Unpredictable error! Unexpected message "${message}" to receiver "${Api.MESSAGE_RECEIVER_NAME}"`);
            }
        }

        public static override _InitForBackground() {
            super._InitForBackground();  // base class init for messaging system
            chrome.alarms.onAlarm.addListener(Api.OnChromeAlarm);
            // If there is a no active alarm and value from storage indicate that there is a running timer
            // most likely it means that browser was closed before timer ran out. To avoid having issues with UI
            // timer values are reset according to the pomodoro info
            chrome.alarms.get(Api.POMODORO_CHROME_ALARM_NAME).then((alarm) => {
                if (alarm === undefined && !timerInfoStorage().isPaused) {
                    console.debug("During last session browser was closed before timer ran out, so timer info was reset");
                    var newTimerInfo = timerInfoStorage();
                    newTimerInfo.isPaused = true;
                    newTimerInfo.startTimeDate = 0;
                    newTimerInfo.lastPauseDate = 0;

                    if (pomodoroInfoStorage().isWorkingSession) {
                        newTimerInfo.durationMs = pomodoroInfoStorage().workSessionDurationMs;
                        newTimerInfo.timeLeftMs = pomodoroInfoStorage().workSessionDurationMs;
                    } else {
                        newTimerInfo.durationMs = pomodoroInfoStorage().breakDurationMs;
                        newTimerInfo.timeLeftMs = pomodoroInfoStorage().breakDurationMs;
                    }
                    setTimerInfoStorage(newTimerInfo);
                }
            });
        }

        private static OnChromeAlarm(alarm: chrome.alarms.Alarm): void {
            // Check if alarm is related to pomodoro
            if (alarm.name === Api.POMODORO_CHROME_ALARM_NAME) {
                var notificationMessage: string;
                var notificationIconUrl: string;
                // Step 1. Update pomodoro info session status
                var pomodoroInfo = pomodoroInfoStorage();
                pomodoroInfo.isWorkingSession = !pomodoroInfo.isWorkingSession;
                setPomodoroInfoStorage(pomodoroInfo);
                // Step 2. Reset timer according to new mode work/rest + select mode specific notification
                var timerInfo = DEFAULT_TIMER_INFO;
                if (pomodoroInfo.isWorkingSession) {
                    timerInfo.timeLeftMs = pomodoroInfo.workSessionDurationMs;
                    timerInfo.durationMs = pomodoroInfo.workSessionDurationMs;
                    notificationIconUrl = chrome.runtime.getURL("rest_notification_icon.png");
                    notificationMessage = "Timer! End of rest time. Good luck and get some work done!"
                } else {
                    timerInfo.timeLeftMs = pomodoroInfo.breakDurationMs;
                    timerInfo.durationMs = pomodoroInfo.breakDurationMs;
                    notificationIconUrl = chrome.runtime.getURL("work_notification_icon.png");
                    notificationMessage = "Timer! End of working session. You can rest now..."
                }
                setTimerInfoStorage(timerInfo);
                // Step 3. Send notification
                chrome.notifications.create({
                    type: "basic",
                    iconUrl: notificationIconUrl,
                    title: "TimeKeeper",
                    message: notificationMessage,
                    priority: 2
                });
            }
        }

        private static async GetLatestTimer(): Promise<TimerInfo> {
            const lastChromeAlarm: chrome.alarms.Alarm | undefined = await chrome.alarms.get(Api.POMODORO_CHROME_ALARM_NAME);
            // Check if there is any running alarm
            if (lastChromeAlarm === undefined) {
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
                chrome.alarms.clearAll();
                return Maybe.Err(new UnexpectedAlarmError("Unreachable error! Can't clear chrome alarm to pause timer.\nTo fix this all alarms were cleared"));
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

        // Note: This is used ONLY for background page. Under any circumstances DON'T use this anywhere else
        static _IsWorkingSession() {
            return pomodoroInfoStorage().isWorkingSession;
        }

        // Note: No validation (yet) because it's handled on the frontend via html input tag.
        // Would be good to have it here as well, but nah...whatever...
        private static SetInfo(workingSessionDurationMs: number, breakDurationMs: number, isWorkingSession: boolean): void {
            const newInfo: PomodoroInfo = {
                workSessionDurationMs: workingSessionDurationMs,
                breakDurationMs: breakDurationMs,
                isWorkingSession: isWorkingSession
            };
            setPomodoroInfoStorage(newInfo);
        }
    }
}