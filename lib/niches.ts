import type { NicheId } from './types';

export interface Niche {
  id: NicheId;
  name: string;
  blurb: string;
  emoji: string;
}

export const NICHES: Niche[] = [
  { id: 'solo', name: 'Solo Play', blurb: 'One-on-one solo sessions', emoji: '🔥' },
  { id: 'joi', name: 'JOI', blurb: 'Guided jerk-off instruction', emoji: '🎙️' },
  { id: 'roleplay', name: 'Roleplay', blurb: 'Scenarios & characters', emoji: '🎭' },
  { id: 'couples', name: 'Couples', blurb: 'Real couples, live', emoji: '💑' },
  { id: 'chat', name: 'Chat & Chill', blurb: 'Flirty conversation, low pressure', emoji: '💬' },
  { id: 'fetish', name: 'Fetish Friendly', blurb: 'Kink-aware creators', emoji: '⛓️' },
];

export function nicheById(id: NicheId): Niche {
  return NICHES.find((n) => n.id === id) ?? NICHES[0];
}
