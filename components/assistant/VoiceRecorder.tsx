"use client";

import { useEffect, useRef, useState } from "react";

const MAX_SECONDS = 118;

function mergeChunks(chunks: Float32Array[]): Float32Array {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const merged = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function resample(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) return input;
  const ratio = inputRate / outputRate;
  const length = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(length);

  for (let index = 0; index < length; index += 1) {
    const position = index * ratio;
    const before = Math.floor(position);
    const after = Math.min(before + 1, input.length - 1);
    const weight = position - before;
    output[index] = input[before]! * (1 - weight) + input[after]! * weight;
  }

  return output;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]!));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function VoiceRecorder({
  disabled,
  onRecorded,
  onError,
}: {
  disabled?: boolean;
  onRecorded: (file: File) => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const muteRef = useRef<GainNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const stopRef = useRef<() => Promise<void>>(async () => {});
  const mountedRef = useRef(true);
  const cancelRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelRef.current = true;
      void stopRef.current();
    };
  }, []);

  async function start() {
    if (recording || busy) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      onError("This browser cannot record audio. Try Chrome, Edge or Safari.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      const context = new AudioContext();
      await context.resume();

      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      // Keep the processor alive without playing the microphone back.
      const mute = context.createGain();
      mute.gain.value = 0;
      chunksRef.current = [];
      processor.onaudioprocess = (event) => {
        chunksRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(mute);
      mute.connect(context.destination);

      streamRef.current = stream;
      contextRef.current = context;
      sourceRef.current = source;
      processorRef.current = processor;
      muteRef.current = mute;
      cancelRef.current = false;
      elapsedRef.current = 0;
      setSeconds(0);
      setRecording(true);

      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        if (mountedRef.current) setSeconds(elapsedRef.current);
        if (elapsedRef.current >= MAX_SECONDS) {
          void stopRef.current();
        }
      }, 1000);
    } catch {
      onError("Microphone access was blocked. Allow it in your browser and try again.");
    }
  }

  // The stop closure reads the latest recording state; the ref is refreshed after every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  async function stop() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const context = contextRef.current;
    const source = sourceRef.current;
    const processor = processorRef.current;
    const mute = muteRef.current;
    const stream = streamRef.current;

    if (processor) {
      processor.onaudioprocess = null;
      processor.disconnect();
    }
    mute?.disconnect();
    source?.disconnect();
    stream?.getTracks().forEach((track) => track.stop());
    const sampleRate = context?.sampleRate ?? 48_000;
    if (context && context.state !== "closed") await context.close().catch(() => {});

    contextRef.current = null;
    sourceRef.current = null;
    processorRef.current = null;
    muteRef.current = null;
    streamRef.current = null;

    if (recording) {
      setRecording(false);
      setBusy(true);
      try {
        const samples = mergeChunks(chunksRef.current);
        chunksRef.current = [];

        if (cancelRef.current) return;

        if (samples.length < sampleRate * 0.4) {
          if (mountedRef.current) onError("That recording was too short. Try again.");
          return;
        }

        const wavSamples = resample(samples, sampleRate, 16_000);
        const blob = encodeWav(wavSamples, 16_000);
        const file = new File([blob], "voice-note.wav", { type: "audio/wav" });
        await onRecorded(file);
      } catch (error) {
        if (mountedRef.current) {
          onError(error instanceof Error ? error.message : "Could not process that recording.");
        }
      } finally {
        if (mountedRef.current) setBusy(false);
      }
    }
  }

  useEffect(() => {
    stopRef.current = stop;
    // Track the latest closure so the timer/unmount handlers stop the current recorder.
  }, [stop]);

  return (
    <div className="flex items-center gap-2">
      {recording ? (
        <>
          <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          <span className="text-sm font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")} / 2:00
          </span>
          <button
            type="button"
            onClick={() => void stop()}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            Stop & transcribe
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => void start()}
          disabled={disabled || busy}
          className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
          {busy ? "Transcribing…" : "Record a voice note"}
        </button>
      )}
    </div>
  );
}
