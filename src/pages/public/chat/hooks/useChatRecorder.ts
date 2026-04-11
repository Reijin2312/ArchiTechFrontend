import { useCallback, useEffect, useRef, useState } from 'react';

type RecordingMode = 'voice' | 'circle';

type UseChatRecorderOptions = {
  onRecorded: (file: File, kind: RecordingMode) => void | Promise<void>;
};

type StopRecordingOptions = {
  discard?: boolean;
};

const CIRCLE_RECORD_SIZE = 720;

const stopStreamTracks = (stream: MediaStream | null) => {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
};

const selectMimeType = (kind: RecordingMode) => {
  const candidates =
    kind === 'voice'
      ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
      : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  for (const candidate of candidates) {
    if ((window as any).MediaRecorder?.isTypeSupported?.(candidate)) {
      return candidate;
    }
  }
  return '';
};

export function useChatRecorder({ onRecorded }: UseChatRecorderOptions) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const sourceMediaStreamRef = useRef<MediaStream | null>(null);
  const recorderMediaStreamRef = useRef<MediaStream | null>(null);
  const circleSourceVideoRef = useRef<HTMLVideoElement | null>(null);
  const circleRenderRafRef = useRef<number | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingKindRef = useRef<RecordingMode | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const discardOnStopRef = useRef(false);

  const [recordingMode, setRecordingMode] = useState<RecordingMode>('voice');
  const [recordingKind, setRecordingKind] = useState<RecordingMode | null>(null);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  const stopCircleRenderPipeline = useCallback(() => {
    if (circleRenderRafRef.current !== null) {
      cancelAnimationFrame(circleRenderRafRef.current);
      circleRenderRafRef.current = null;
    }

    if (circleSourceVideoRef.current) {
      circleSourceVideoRef.current.pause();
      circleSourceVideoRef.current.srcObject = null;
      circleSourceVideoRef.current = null;
    }
  }, []);

  const clearRecordingState = useCallback(() => {
    recordingChunksRef.current = [];
    recordingKindRef.current = null;
    recordingStartedAtRef.current = null;
    discardOnStopRef.current = false;
    mediaRecorderRef.current = null;
    setRecordingKind(null);
    setRecordingElapsedMs(0);
    setPreviewStream(null);
    stopCircleRenderPipeline();
    stopStreamTracks(recorderMediaStreamRef.current);
    stopStreamTracks(sourceMediaStreamRef.current);
    recorderMediaStreamRef.current = null;
    sourceMediaStreamRef.current = null;
  }, [stopCircleRenderPipeline]);

  const buildCircleRecorderStream = useCallback(async (sourceStream: MediaStream) => {
    const sourceVideoTrack = sourceStream.getVideoTracks()[0];
    if (!sourceVideoTrack) {
      throw new Error('Camera video track is missing');
    }

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.srcObject = new MediaStream([sourceVideoTrack]);

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const timeoutId = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('Timed out waiting for camera metadata'));
      }, 4000);

      video.onloadedmetadata = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve();
      };
      video.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        reject(new Error('Failed to initialize camera preview'));
      };
    });

    await video.play().catch(() => undefined);

    const canvas = document.createElement('canvas');
    canvas.width = CIRCLE_RECORD_SIZE;
    canvas.height = CIRCLE_RECORD_SIZE;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('2D canvas context is unavailable');
    }

    const drawFrame = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width > 0 && height > 0) {
        const sourceSize = Math.min(width, height);
        const sx = (width - sourceSize) / 2;
        const sy = (height - sourceSize) / 2;
        // Normalize selfie-camera mirroring for persisted circle videos.
        ctx.save();
        ctx.translate(CIRCLE_RECORD_SIZE, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(
          video,
          sx,
          sy,
          sourceSize,
          sourceSize,
          0,
          0,
          CIRCLE_RECORD_SIZE,
          CIRCLE_RECORD_SIZE
        );
        ctx.restore();
      }
      circleRenderRafRef.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    const recorderStream = canvas.captureStream(30);
    sourceStream.getAudioTracks().forEach((track) => recorderStream.addTrack(track));
    circleSourceVideoRef.current = video;

    return recorderStream;
  }, []);

  const stopRecording = useCallback(
    ({ discard = false }: StopRecordingOptions = {}) => {
      discardOnStopRef.current = discard;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
        return;
      }
      clearRecordingState();
    },
    [clearRecordingState]
  );

  const startRecording = useCallback(
    async (kind = recordingMode) => {
      if (!(window as any).MediaRecorder) {
        throw new Error('MediaRecorder is not supported in this browser');
      }
      if (recordingKindRef.current || isStarting) {
        return;
      }

      setIsStarting(true);
      try {
        const constraints: MediaStreamConstraints =
          kind === 'voice'
            ? { audio: true }
            : {
                audio: true,
                video: {
                  width: { ideal: 1280 },
                  height: { ideal: 1280 },
                  facingMode: 'user',
                },
              };
        const sourceStream = await navigator.mediaDevices.getUserMedia(constraints);
        const recorderStream =
          kind === 'circle' ? await buildCircleRecorderStream(sourceStream) : sourceStream;
        const mimeType = selectMimeType(kind);
        const recorder = mimeType
          ? new MediaRecorder(recorderStream, {
              mimeType,
              ...(kind === 'circle'
                ? {
                    videoBitsPerSecond: 900_000,
                    audioBitsPerSecond: 64_000,
                  }
                : {}),
            })
          : new MediaRecorder(recorderStream);

        recordingKindRef.current = kind;
        recordingChunksRef.current = [];
        recordingStartedAtRef.current = Date.now();
        sourceMediaStreamRef.current = sourceStream;
        recorderMediaStreamRef.current = recorderStream;
        mediaRecorderRef.current = recorder;
        setRecordingKind(kind);
        setPreviewStream(kind === 'circle' ? sourceStream : null);

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordingChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const recordedKind = recordingKindRef.current;
          const shouldDiscard = discardOnStopRef.current;
          const chunks = [...recordingChunksRef.current];
          const type = recorder.mimeType || (recordedKind === 'voice' ? 'audio/webm' : 'video/webm');
          const blob = new Blob(chunks, { type });

          if (recordedKind && !shouldDiscard && blob.size > 0) {
            const extension = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'mp4' : 'webm';
            const fileName = `${recordedKind}-${Date.now()}.${extension}`;
            const file = new File([blob], fileName, { type });
            void onRecorded(file, recordedKind);
          }

          clearRecordingState();
        };

        recorder.start(250);
      } catch (error) {
        clearRecordingState();
        throw error;
      } finally {
        setIsStarting(false);
      }
    },
    [buildCircleRecorderStream, clearRecordingState, isStarting, onRecorded, recordingMode]
  );

  const toggleRecordingMode = useCallback(() => {
    if (recordingKindRef.current || isStarting) return;
    setRecordingMode((prev) => (prev === 'voice' ? 'circle' : 'voice'));
  }, [isStarting]);

  useEffect(() => {
    if (!recordingKind) {
      setRecordingElapsedMs(0);
      return;
    }

    const tick = () => {
      if (recordingStartedAtRef.current === null) {
        setRecordingElapsedMs(0);
        return;
      }
      setRecordingElapsedMs(Math.max(0, Date.now() - recordingStartedAtRef.current));
    };

    tick();
    const timerId = window.setInterval(tick, 100);
    return () => {
      window.clearInterval(timerId);
    };
  }, [recordingKind]);

  useEffect(
    () => () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        discardOnStopRef.current = true;
        mediaRecorderRef.current.stop();
      } else {
        clearRecordingState();
      }
    },
    [clearRecordingState]
  );

  return {
    recordingMode,
    recordingKind,
    recordingElapsedMs,
    isRecording: recordingKind !== null,
    isStarting,
    previewStream,
    startRecording,
    stopRecording,
    toggleRecordingMode,
  };
}
