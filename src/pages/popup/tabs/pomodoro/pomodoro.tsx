import { AiOutlinePauseCircle, AiOutlinePlayCircle } from 'solid-icons/ai';
import "./pomodoro.css";


function Timer() {
    return <>
        <div id="pomodoroTimerRoot" class="radial-progress text-primary" style="--value: 100; --thickness: 4px; --size: 14rem">
            <div class="flex flex-col justify-center">
                <div class="flex gap-5 text-base-content">
                    <div class="countdown-container">
                        <span class="countdown-container-value"><span style="--value:10;"></span></span>
                        hours
                    </div>
                    <div class="countdown-container">
                        <span class="countdown-container-value"><span style="--value:24;"></span></span>
                        min
                    </div>
                    <div class="countdown-container">
                        <span class="countdown-container-value"><span style="--value:54;"></span></span>
                        sec
                    </div>
                </div>
                <div class="absolute bottom-5 left-1/2 right-1/2 flex justify-center">
                    <label class="h-1/2 swap swap-rotate text-secondary">
                        <input type="checkbox" />
                        <AiOutlinePauseCircle class="swap-off fill-current" size={48} />
                        <AiOutlinePlayCircle class="swap-on fill-current" size={48} />
                    </label>
                </div>
            </div>
        </div>
    </>
}

export default function PomodoroRoot() {
    return <>
        <div class="flex justify-center p-2">
            <Timer />
        </div>
    </>
}