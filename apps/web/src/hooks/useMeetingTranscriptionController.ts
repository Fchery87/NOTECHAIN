import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioCapture } from './useAudioCapture';
import { useHuggingFaceTranscription } from './useHuggingFaceTranscription';
import { useWebSpeechTranscription } from './useWebSpeechTranscription';
import { HuggingFaceTranscriptionService } from '../lib/ai/transcription/huggingfaceTranscriptionService';
import { WebSpeechTranscriptionService } from '../lib/ai/transcription/webSpeechTranscriptionService';

export type TranscriptionMode = 'webspeech' | 'huggingface' | null;

interface UseMeetingTranscriptionControllerOptions {
  onError: (error: string) => void;
  onFinalTranscript: (transcript: string) => void;
}

export interface MeetingTranscriptionController {
  mode: TranscriptionMode;
  selectMode: (mode: TranscriptionMode) => void;
  transcript: string;
  audioBlob: Blob | null;
  recordingDuration: number;
  isRecording: boolean;
  isProcessing: boolean;
  isWebSpeechSupported: boolean;
  isHuggingFaceSupported: boolean;
  isHfModelLoaded: boolean;
  isHfLoading: boolean;
  isHfTranscribing: boolean;
  hfProgress: number;
  canStartSelectedMode: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  stopActiveRecording: () => void;
  resetForNewRecording: () => void;
}

export function useMeetingTranscriptionController({
  onError,
  onFinalTranscript,
}: UseMeetingTranscriptionControllerOptions): MeetingTranscriptionController {
  const [mode, setMode] = useState<TranscriptionMode>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    isListening: isWebSpeechListening,
    transcript: webSpeechTranscript,
    interimTranscript,
    startListening: startWebSpeech,
    stopListening: stopWebSpeech,
    resetTranscript: resetWebSpeech,
  } = useWebSpeechTranscription({
    language: 'en-US',
    continuous: true,
    interimResults: true,
    onTranscript: (newTranscript, isFinal) => {
      if (isFinal) onFinalTranscript(newTranscript);
    },
    onError,
  });

  const {
    isModelLoaded: isHfModelLoaded,
    isLoading: isHfLoading,
    isTranscribing: isHfTranscribing,
    progress: hfProgress,
    transcript: huggingFaceTranscript,
    initialize: initHf,
    transcribe: transcribeHf,
    resetTranscript: resetHf,
  } = useHuggingFaceTranscription({
    model: 'onnx-community/whisper-tiny',
    language: 'en',
    onTranscript: text => {
      onFinalTranscript(text);
    },
    onError,
  });

  const {
    isRecording: isAudioRecording,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
  } = useAudioCapture({ onError });

  const isRecording = mode === 'webspeech' ? isWebSpeechListening : isAudioRecording;
  const isProcessing = mode === 'huggingface' && isHfTranscribing;
  const transcript =
    mode === 'webspeech'
      ? webSpeechTranscript + (interimTranscript ? ` ${interimTranscript}` : '')
      : huggingFaceTranscript;

  useEffect(() => {
    if (isRecording) {
      recordingStartTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          setRecordingDuration(Math.floor((Date.now() - recordingStartTimeRef.current) / 1000));
        }
      }, 1000);
    } else if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, [isRecording]);

  useEffect(() => {
    if (mode === 'huggingface' && !isAudioRecording && audioBlob) {
      transcribeHf(audioBlob);
    }
  }, [isAudioRecording, audioBlob, mode, transcribeHf]);

  const selectMode = useCallback(
    (selectedMode: TranscriptionMode) => {
      setMode(selectedMode);
      if (selectedMode === 'huggingface') initHf();
    },
    [initHf]
  );

  const resetForNewRecording = useCallback(() => {
    setAudioBlob(null);
    setRecordingDuration(0);
  }, []);

  const startRecording = useCallback(async () => {
    resetForNewRecording();

    if (mode === 'webspeech') {
      resetWebSpeech();
      startWebSpeech();
      return;
    }

    if (mode === 'huggingface') {
      resetHf();
      await startAudioRecording();
    }
  }, [mode, resetForNewRecording, resetWebSpeech, startWebSpeech, resetHf, startAudioRecording]);

  const stopRecording = useCallback(async () => {
    if (mode === 'webspeech') {
      stopWebSpeech();
    } else if (mode === 'huggingface') {
      const blob = await stopAudioRecording();
      if (blob) setAudioBlob(blob);
    }

    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
  }, [mode, stopWebSpeech, stopAudioRecording]);

  const stopActiveRecording = useCallback(() => {
    if (isWebSpeechListening) stopWebSpeech();
    if (isAudioRecording) void stopAudioRecording();
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
  }, [isWebSpeechListening, isAudioRecording, stopWebSpeech, stopAudioRecording]);

  return {
    mode,
    selectMode,
    transcript,
    audioBlob,
    recordingDuration,
    isRecording,
    isProcessing,
    isWebSpeechSupported: WebSpeechTranscriptionService.isSupported(),
    isHuggingFaceSupported: HuggingFaceTranscriptionService.isSupported(),
    isHfModelLoaded,
    isHfLoading,
    isHfTranscribing,
    hfProgress,
    canStartSelectedMode: mode !== 'huggingface' || (isHfModelLoaded && !isHfLoading),
    startRecording,
    stopRecording,
    stopActiveRecording,
    resetForNewRecording,
  };
}
