import { CloseIcon, PauseIcon, PlayIcon } from '../icons';
import type { ChatPlaybackState } from '../types';
import { formatDuration } from '../utils';

type ChatPlaybackBannerProps = {
  playback: ChatPlaybackState | null;
  visible: boolean;
  onClose: () => void;
};

function SkipBackIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7 6v12M18 6 9.8 12 18 18V6Z" fill="currentColor" />
    </svg>
  );
}

function SkipForwardIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M17 6v12M6 6l8.2 6L6 18V6Z" fill="currentColor" />
    </svg>
  );
}

function SpeakerIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
      <path d="M16.5 9.2a4.5 4.5 0 0 1 0 5.6M18.9 6.8a7.5 7.5 0 0 1 0 10.4" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

const formatBannerDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const dayPart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timePart = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${dayPart} at ${timePart}`;
};

export function ChatPlaybackBanner({ playback, visible, onClose }: ChatPlaybackBannerProps) {
  const progress =
    playback && playback.durationSec > 0
      ? Math.min(1, Math.max(0, playback.currentSec / playback.durationSec))
      : 0;

  return (
    <div
      className={`relative z-20 overflow-hidden bg-[#1a1b20] shadow-[inset_0_-1px_0_rgba(255,255,255,0.045)] transition-[max-height,opacity,transform] duration-300 ${
        visible && playback ? 'max-h-[66px] opacity-100 translate-y-0' : 'pointer-events-none max-h-0 opacity-0 -translate-y-1'
      }`}
    >
      {playback ? (
        <div className="relative flex h-[66px] items-center justify-between px-[18px]">
          <div className="flex min-w-0 items-center gap-[6px] text-[#8e78f4]">
            <button
              type="button"
              onClick={() => playback.seekBy(-5)}
              className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-white/10"
              aria-label="Seek backward 5 seconds"
            >
              <SkipBackIcon />
            </button>

            <button
              type="button"
              onClick={playback.togglePlay}
              className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-white/10"
              aria-label={playback.isPlaying ? 'Pause playback' : 'Resume playback'}
            >
              {playback.isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} className="translate-x-[1px]" />}
            </button>

            <button
              type="button"
              onClick={() => playback.seekBy(5)}
              className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-white/10"
              aria-label="Seek forward 5 seconds"
            >
              <SkipForwardIcon />
            </button>
          </div>

          <div className="mx-[8px] min-w-0 flex-1">
            <div className="truncate text-[17px] font-[700] leading-none text-white">
              {playback.author}
            </div>
            <div className="mt-[5px] truncate text-[13px] leading-none text-white/63">
              {formatDuration(playback.currentSec)} | {formatBannerDate(playback.createdAt)}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-[6px] text-[#8e78f4]">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-white/10"
              aria-label="Playback volume"
            >
              <SpeakerIcon />
            </button>
            <button
              type="button"
              className="px-[6px] text-[18px] font-[700] leading-none tracking-[0.3px] text-white/82 transition-colors hover:text-white"
              aria-label="Playback speed"
            >
              1X
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full text-white/86 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close playback banner"
            >
              <CloseIcon size={20} />
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
            <div
              className="h-full bg-[#9b86f5] transition-[width] duration-100"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
