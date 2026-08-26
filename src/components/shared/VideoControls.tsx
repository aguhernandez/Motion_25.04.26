import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, ChevronFirst, ChevronLast,
  Volume2, VolumeX,
} from 'lucide-react';
import { useT } from '../../lib/LanguageContext';
import { getTheme } from '../../lib/theme';

export interface VideoControlsHandle {
  getCurrentFrameDataUrl: () => string;
  getCurrentTimeMs: () => number;
  getVideoElement: () => HTMLVideoElement | null;
}

interface VideoControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onFrameChange?: (frameDataUrl: string, timeMs: number) => void;
  onDurationChange?: (durationMs: number) => void;
  onTimeUpdate?: (timeMs: number) => void;
}

const SPEEDS = [0.25, 0.5, 1];

const VideoControls = forwardRef<VideoControlsHandle, VideoControlsProps>(
  ({ videoRef, onFrameChange, onDurationChange, onTimeUpdate }, ref) => {
    const { darkMode } = useT();
    const th = getTheme(darkMode);
    const offscreenRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [muted, setMuted] = useState(true);
    const [speed, setSpeed] = useState(1);
    const [fps] = useState(30);
    const frameStep = 1 / fps;

    useImperativeHandle(ref, () => ({
      getCurrentFrameDataUrl: () => captureFrame(),
      getCurrentTimeMs: () => Math.round((videoRef.current?.currentTime ?? 0) * 1000),
      getVideoElement: () => videoRef.current,
    }));

    const captureFrame = useCallback((): string => {
      const video = videoRef.current;
      const canvas = offscreenRef.current;
      if (!video || !canvas) return '';
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.92);
    }, [videoRef]);

    // Notify a frame capture (used for tracking / snapshot export)
    const notifyFrame = useCallback(() => {
      const dataUrl = captureFrame();
      const ms = Math.round((videoRef.current?.currentTime ?? 0) * 1000);
      if (dataUrl) onFrameChange?.(dataUrl, ms);
    }, [captureFrame, onFrameChange, videoRef]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const onLoaded = () => {
        const dur = video.duration;
        if (isNaN(dur)) return;
        setDuration(dur);
        onDurationChange?.(Math.round(dur * 1000));
        video.pause();
        video.playbackRate = speed;
        setPlaying(false);
        setTimeout(() => notifyFrame(), 150);
      };

      const onTimeUpdateEvt = () => {
        setCurrentTime(video.currentTime);
        onTimeUpdate?.(Math.round(video.currentTime * 1000));
      };

      const onEnded = () => {
        setPlaying(false);
      };

      const onPlay = () => setPlaying(true);
      const onPause = () => {
        setPlaying(false);
        notifyFrame();
      };

      video.addEventListener('loadeddata', onLoaded);
      video.addEventListener('timeupdate', onTimeUpdateEvt);
      video.addEventListener('ended', onEnded);
      video.addEventListener('play', onPlay);
      video.addEventListener('pause', onPause);

      return () => {
        video.removeEventListener('loadeddata', onLoaded);
        video.removeEventListener('timeupdate', onTimeUpdateEvt);
        video.removeEventListener('ended', onEnded);
        video.removeEventListener('play', onPlay);
        video.removeEventListener('pause', onPause);
      };
    }, [notifyFrame, onDurationChange, onTimeUpdate, videoRef, speed]);

    // Apply playback speed
    useEffect(() => {
      if (videoRef.current) videoRef.current.playbackRate = speed;
    }, [speed, videoRef]);

    const seekTo = useCallback((time: number) => {
      const video = videoRef.current;
      if (!video) return;
      const clamped = Math.max(0, Math.min(duration, time));
      video.currentTime = clamped;
      setCurrentTime(clamped);
      setTimeout(() => notifyFrame(), 80);
    }, [duration, notifyFrame, videoRef]);

    const togglePlay = () => {
      const video = videoRef.current;
      if (!video) return;
      if (playing) { video.pause(); }
      else { video.play().catch(() => {}); }
    };

    const stepBack = useCallback(() => seekTo(currentTime - frameStep), [seekTo, currentTime, frameStep]);
    const stepForward = useCallback(() => seekTo(currentTime + frameStep), [seekTo, currentTime, frameStep]);
    const goStart = () => seekTo(0);
    const goEnd = () => seekTo(duration);

    const formatTime = (s: number) => {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      const ms = Math.round((s % 1) * 1000);
      return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    };

    const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

    const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      seekTo(ratio * duration);
    };

    const btnStyle = (active = false): React.CSSProperties => ({
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '2rem', height: '2rem', borderRadius: '0.5rem',
      background: active ? 'rgba(6,182,212,0.15)' : th.btnBg,
      border: `1px solid ${active ? 'rgba(6,182,212,0.4)' : th.btnBorder}`,
      color: active ? '#06b6d4' : th.btnText,
      cursor: 'pointer', flexShrink: 0,
    });

    return (
      <div className="space-y-2">
        <canvas ref={offscreenRef} className="hidden" />

        <div
          className="relative h-2 rounded-full cursor-pointer group"
          style={{ background: th.progressTrack }}
          onClick={handleSeekClick}
        >
          <div className="absolute top-0 left-0 h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#06b6d4' }} />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 transition-all opacity-0 group-hover:opacity-100"
            style={{ left: `calc(${pct}% - 6px)`, background: '#06b6d4', borderColor: '#fff' }}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={goStart} style={btnStyle()} title="Ir al inicio">
            <ChevronFirst className="w-3.5 h-3.5" />
          </button>
          <button onClick={stepBack} style={btnStyle()} title="Fotograma anterior (-1f)">
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button onClick={togglePlay} style={{ ...btnStyle(playing), width: '2.5rem', height: '2.5rem' }} title={playing ? 'Pausar' : 'Reproducir'}>
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button onClick={stepForward} style={btnStyle()} title="Fotograma siguiente (+1f)">
            <SkipForward className="w-3.5 h-3.5" />
          </button>
          <button onClick={goEnd} style={btnStyle()} title="Ir al final">
            <ChevronLast className="w-3.5 h-3.5" />
          </button>

          <div className="flex-1 text-center">
            <span className="text-xs font-mono" style={{ color: '#06b6d4' }}>{formatTime(currentTime)}</span>
            <span className="text-xs mx-1" style={{ color: th.empty }}>/</span>
            <span className="text-xs font-mono" style={{ color: th.sub }}>{formatTime(duration)}</span>
          </div>

          <div className="flex items-center gap-1">
            <label className="text-xs" style={{ color: th.sub }}>Vel</label>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="text-xs px-1.5 py-1 rounded focus:outline-none"
              style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText, width: '4rem' }}
            >
              {SPEEDS.map((s) => <option key={s} value={s}>{s}x</option>)}
            </select>
          </div>

          <button onClick={() => setMuted((v) => !v)} style={btnStyle(!muted)} title={muted ? 'Activar sonido' : 'Silenciar'}>
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs px-0.5" style={{ color: th.sub }}>
          <span>← → teclas para navegar por fotogramas cuando está pausado</span>
        </div>
      </div>
    );
  }
);

VideoControls.displayName = 'VideoControls';
export default VideoControls;
