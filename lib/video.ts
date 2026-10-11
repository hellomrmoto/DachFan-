// Video provider seam. Production uses LiveKit (SFU) — never hand-rolled
// WebRTC. Until LIVEKIT_* keys are set, sessions run in mock mode: the room
// UI renders simulated tiles and the timer/billing path is fully exercised.

export type VideoProvider = 'livekit' | 'mock';

export interface VideoRoomConfig {
  provider: VideoProvider;
  url?: string;
  token?: string;
  roomName?: string;
}

export function getVideoProvider(): VideoProvider {
  return process.env.LIVEKIT_URL ? 'livekit' : 'mock';
}

export function makeRoomConfig(sessionId: string, role: 'buyer' | 'creator'): VideoRoomConfig {
  if (getVideoProvider() === 'livekit') {
    // TODO(LiveKit): mint a real access token server-side with the
    // livekit-server-sdk and return url + token + roomName here.
    return { provider: 'livekit', roomName: `session_${sessionId}`, url: process.env.LIVEKIT_URL };
  }
  return { provider: 'mock', roomName: `session_${sessionId}` };
}
