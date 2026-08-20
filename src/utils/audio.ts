/**
 * Audio manager for PCM 24kHz voice synthesis playback and speech recognition
 */

let playbackAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!playbackAudioCtx || playbackAudioCtx.state === 'closed') {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    playbackAudioCtx = new AudioCtxClass({ sampleRate: 24000 });
  }
  if (playbackAudioCtx.state === 'suspended') {
    playbackAudioCtx.resume().catch(() => {});
  }
  return playbackAudioCtx;
}

/**
 * Decodes base64 raw 16-bit PCM little-endian audio (24kHz) and plays it through AudioContext
 */
export async function playPCM24kAudio(
  base64Data: string,
  onStart?: () => void,
  onEnded?: () => void
): Promise<AudioBufferSourceNode | null> {
  try {
    const ctx = getAudioContext();
    const binary = atob(base64Data);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);

    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.copyToChannel(float32Array, 0);

    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(ctx.destination);

    if (onStart) onStart();
    sourceNode.onended = () => {
      if (onEnded) onEnded();
    };

    sourceNode.start(0);
    return sourceNode;
  } catch (err) {
    console.error('Failed to play PCM audio:', err);
    if (onEnded) onEnded();
    return null;
  }
}

/**
 * Procedural UI Sound Effects
 */
export function playChime(freq = 587.33, type: OscillatorType = 'triangle', duration = 0.4) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Ignore audio context errors before user gesture
  }
}

export function playContractSignedSfx() {
  try {
    const ctx = getAudioContext();
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        playChime(freq, 'sine', 0.5);
      }, idx * 100);
    });
  } catch (e) {}
}

/**
 * Speech Recognition Helper for Live Voice Interview
 */
export interface VoiceRecognitionSession {
  start: () => void;
  stop: () => void;
  isSupported: boolean;
}

export function createSpeechRecognizer(
  onResult: (transcript: string, isFinal: boolean) => void,
  onError?: (err: any) => void
): VoiceRecognitionSession {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return {
      start: () => {},
      stop: () => {},
      isSupported: false,
    };
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event: any) => {
    let interim = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }

    if (finalTranscript) {
      onResult(finalTranscript, true);
    } else if (interim) {
      onResult(interim, false);
    }
  };

  recognition.onerror = (event: any) => {
    if (onError) onError(event.error);
  };

  return {
    start: () => {
      try {
        recognition.start();
      } catch (e) {
        // Recognition already started
      }
    },
    stop: () => {
      try {
        recognition.stop();
      } catch (e) {}
    },
    isSupported: true,
  };
}
