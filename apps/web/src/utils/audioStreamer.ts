/**
 * Records microphone audio as 16 kHz mono WAV so the configured server side model
 * can transcribe the complete request without browser side speech recognition.
 */

export interface VoiceStreamerCallbacks {
  onError?: (err: Error) => void;
  onAutoStop?: (audio: Blob) => void;
  onAudioFrame?: (pcm16Frame: ArrayBuffer) => void;
  onStateChange?: (state: 'idle' | 'listening' | 'transcribing' | 'refining' | 'ready') => void;
}

function encodePCM16(samples: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return buffer;
}

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count (mono) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  // PCM 16-bit float-to-int conversion
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export class VoiceStreamer {
  private callbacks: VoiceStreamerCallbacks;

  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptNode: ScriptProcessorNode | null = null;

  private isRecording: boolean = false;
  private audioChunks: Float32Array[] = [];
  private totalSamples: number = 0;
  private hasSpoken: boolean = false;
  private silenceStartedAt: number | null = null;
  private autoStopStarted: boolean = false;
  private readonly silenceThreshold = 0.012;
  private readonly silenceDurationMs = 1200;

  constructor(callbacks: VoiceStreamerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public async start(): Promise<void> {
    if (this.isRecording) return;
    this.isRecording = true;
    this.audioChunks = [];
    this.totalSamples = 0;
    this.hasSpoken = false;
    this.silenceStartedAt = null;
    this.autoStopStarted = false;
    this.callbacks.onStateChange?.('listening');

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      const source = this.audioCtx.createMediaStreamSource(this.mediaStream);

      // Attempt to load AudioWorklet to avoid ScriptProcessor deprecation warning
      let workletLoaded = false;
      if (this.audioCtx.audioWorklet) {
        try {
          const workletCode = `
            class ScopeAudioProcessor extends AudioWorkletProcessor {
              process(inputs, outputs, parameters) {
                const input = inputs[0];
                if (input && input[0]) {
                  this.port.postMessage(input[0]);
                }
                return true;
              }
            }
            registerProcessor('scope-audio-processor', ScopeAudioProcessor);
          `;
          const blob = new Blob([workletCode], { type: 'application/javascript' });
          const workletUrl = URL.createObjectURL(blob);
          await this.audioCtx.audioWorklet.addModule(workletUrl);
          URL.revokeObjectURL(workletUrl);

          const workletNode = new AudioWorkletNode(this.audioCtx, 'scope-audio-processor');
          workletNode.port.onmessage = (event) => {
            if (!this.isRecording) return;
            const inputData = event.data;
            this.handleAudioFrame(inputData);
          };
          source.connect(workletNode);
          workletNode.connect(this.audioCtx.destination);
          this.scriptNode = workletNode as any;
          workletLoaded = true;
        } catch {
          workletLoaded = false;
        }
      }

      // Fallback to ScriptProcessor if AudioWorklet unavailable
      if (!workletLoaded) {
        const proc = this.audioCtx.createScriptProcessor(2048, 1, 1);
        proc.onaudioprocess = (e) => {
          if (!this.isRecording) return;
          const inputData = e.inputBuffer.getChannelData(0);
          this.handleAudioFrame(inputData);
        };
        source.connect(proc);
        proc.connect(this.audioCtx.destination);
        this.scriptNode = proc;
      }
    } catch (err) {
      this.isRecording = false;
      this.mediaStream?.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
      this.callbacks.onError?.(err instanceof Error ? err : new Error('Microphone access is unavailable.'));
      throw err;
    }
  }

  private handleAudioFrame(inputData: Float32Array) {
    const copy = new Float32Array(inputData);
    this.audioChunks.push(copy);
    this.totalSamples += copy.length;
    this.callbacks.onAudioFrame?.(encodePCM16(copy));

    let sumSquares = 0;
    for (let i = 0; i < copy.length; i++) sumSquares += copy[i] * copy[i];
    const rms = Math.sqrt(sumSquares / copy.length);
    if (rms >= this.silenceThreshold) {
      this.hasSpoken = true;
      this.silenceStartedAt = null;
      return;
    }
    if (!this.hasSpoken || this.autoStopStarted) return;
    if (this.silenceStartedAt === null) {
      this.silenceStartedAt = Date.now();
      return;
    }
    if (Date.now() - this.silenceStartedAt >= this.silenceDurationMs) {
      this.autoStopStarted = true;
      void this.stop().then((audio) => {
        if (audio) this.callbacks.onAutoStop?.(audio);
      }).catch((err: unknown) => {
        this.callbacks.onError?.(err instanceof Error ? err : new Error('Could not finish recording.'));
      });
    }
  }

  public async stop(): Promise<Blob | null> {
    if (!this.isRecording) return null;
    this.isRecording = false;
    this.callbacks.onStateChange?.('transcribing');

    // Clean up AudioContext & MediaStream
    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        await this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
    // Merge audio chunks into WAV blob
    if (this.totalSamples > 0) {
      const merged = new Float32Array(this.totalSamples);
      let offset = 0;
      for (const chunk of this.audioChunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      return encodeWAV(merged, 16000);
    }

    return null;
  }
}
