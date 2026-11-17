// Fork: every clip gets a fresh <video>, and a fresh one starts at full volume, so
// stepping to the next clip blasted it even after the viewer had turned it down.
// The volume and mute the viewer last chose are kept here and put on each new one.
const KEY = 'miyav.videoVolume';

type Saved = { volume: number; muted: boolean };

function read(): Saved | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved.volume === 'number' && Number.isFinite(saved.volume)) {
      return { volume: Math.min(1, Math.max(0, saved.volume)), muted: saved.muted === true };
    }
  } catch {
    // private window or storage blocked: every clip starts at full volume, as before
  }
  return null;
}

/** Puts the remembered volume on a new video before it starts playing. */
export function restoreVideoVolume(video: HTMLVideoElement | null) {
  if (!video || video.dataset.volumeRestored) return;
  video.dataset.volumeRestored = '1';
  const saved = read();
  if (!saved) return;
  video.volume = saved.volume;
  if (saved.muted) video.muted = true;
}

/** Remembers what the viewer set on the video's own volume control. */
export function saveVideoVolume(video: HTMLVideoElement) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ volume: video.volume, muted: video.muted }));
  } catch {
    // nothing to do: the next clip just starts at full volume
  }
}
