import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { File, Paths } from "expo-file-system";

type Effect = "select" | "success" | "error";
const SAMPLE_RATE = 16000;
let setup: Promise<void> | null = null;
let effects: Partial<Record<Effect, AudioPlayer>> = {};
let music: AudioPlayer | null = null;
let soundOn = true;
let musicOn = false;

function makeWave(seconds: number, sample: (time: number, index: number) => number): Uint8Array {
  const count = Math.floor(SAMPLE_RATE * seconds);
  const bytes = new Uint8Array(44 + count * 2);
  const view = new DataView(bytes.buffer);
  const put = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i);
  };
  put(0, "RIFF"); view.setUint32(4, 36 + count * 2, true); put(8, "WAVE");
  put(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); put(36, "data"); view.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) {
    const value = Math.max(-1, Math.min(1, sample(i / SAMPLE_RATE, i)));
    view.setInt16(44 + i * 2, Math.round(value * 32767), true);
  }
  return bytes;
}

function effectWave(kind: Effect): Uint8Array {
  const frequency = kind === "select" ? 660 : kind === "success" ? 880 : 190;
  const duration = kind === "success" ? 0.32 : 0.14;
  return makeWave(duration, (t) => {
    const envelope = Math.pow(1 - t / duration, kind === "error" ? 1.2 : 2.4);
    const second = kind === "success" ? Math.sin(2 * Math.PI * 1320 * t) * 0.22 : 0;
    const fundamental = Math.sin(2 * Math.PI * frequency * t) * (kind === "error" ? 0.55 : 0.34);
    return (fundamental + second) * envelope;
  });
}

function musicWave(): Uint8Array {
  const notes = [
    [196, 247, 294], [174.61, 220, 261.63],
    [146.83, 196, 246.94], [164.81, 207.65, 246.94],
  ];
  const duration = 8;
  return makeWave(duration, (t) => {
    const chord = notes[Math.min(3, Math.floor(t / 2))];
    const phase = t % 2;
    const fade = Math.min(1, phase / 0.18, (2 - phase) / 0.22);
    const pulse = 0.72 + 0.28 * Math.sin(Math.PI * phase / 2) ** 2;
    const tone = chord.reduce((sum, hz, index) => sum + Math.sin(2 * Math.PI * hz * t) / (index + 1), 0) / 1.83;
    return tone * Math.max(0, fade) * pulse * 0.12;
  });
}

async function localAudioFile(name: string, bytes: Uint8Array): Promise<string> {
  const file = new File(Paths.cache, "shadecode-arena-" + name + ".wav");
  if (!file.exists) {
    file.create();
    await file.write(bytes);
  }
  return file.uri;
}

export async function initializeTileRushAudio(): Promise<void> {
  if (!setup) {
    setup = (async () => {
      await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "mixWithOthers" });
      const [selectUri, successUri, errorUri, musicUri] = await Promise.all([
        localAudioFile("select", effectWave("select")),
        localAudioFile("success", effectWave("success")),
        localAudioFile("error", effectWave("error")),
        localAudioFile("ambient-loop", musicWave()),
      ]);
      effects = {
        select: createAudioPlayer({ uri: selectUri }),
        success: createAudioPlayer({ uri: successUri }),
        error: createAudioPlayer({ uri: errorUri }),
      };
      music = createAudioPlayer({ uri: musicUri });
      music.loop = true;
      music.volume = 0.16;
      for (const player of Object.values(effects)) if (player) player.volume = 0.38;
      if (musicOn) music.play();
    })().catch((error) => {
      setup = null;
      throw error;
    });
  }
  await setup;
}

export function setTileRushAudioPreferences(soundEnabled: boolean, musicEnabled: boolean): void {
  soundOn = soundEnabled;
  musicOn = musicEnabled;
  if (!setup || !music) return;
  if (musicOn) music.play();
  else music.pause();
}

export function playTileRushEffect(kind: Effect): void {
  if (!soundOn || !setup) return;
  const player = effects[kind];
  if (!player || !player.isLoaded) return;
  void player.seekTo(0).then(() => player.play()).catch(() => undefined);
}

export function stopTileRushMusic(): void {
  music?.pause();
}
