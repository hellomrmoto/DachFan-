import type { Creator } from './types';

// Mock creator pool for the demo. In production these are real creator
// accounts; the acceptProbability/responseTimeSec fields go away and pings
// are answered by humans in the creator app.
export function seedCreators(): Creator[] {
  return [
    {
      id: 'cr_maya', name: 'Maya Blaze', tagline: 'Your wish, my command 🔥',
      niches: ['solo', 'joi'], rateCentsPerMin: 350, minMinutes: 5,
      rating: 4.9, ratingsCount: 231, online: true,
      acceptProbability: 0.85, responseTimeSec: 6, color: 'from-rose-500 to-orange-500',
    },
    {
      id: 'cr_dante', name: 'Dante', tagline: 'Deep voice, deeper sessions',
      niches: ['solo', 'roleplay', 'chat'], rateCentsPerMin: 275, minMinutes: 5,
      rating: 4.7, ratingsCount: 189, online: true,
      acceptProbability: 0.7, responseTimeSec: 11, color: 'from-indigo-500 to-purple-500',
    },
    {
      id: 'cr_luna', name: 'Luna & Rex', tagline: 'Real couple, real chemistry',
      niches: ['couples', 'roleplay'], rateCentsPerMin: 500, minMinutes: 10,
      rating: 4.8, ratingsCount: 156, online: true,
      acceptProbability: 0.6, responseTimeSec: 14, color: 'from-pink-500 to-fuchsia-500',
    },
    {
      id: 'cr_onyx', name: 'Onyx', tagline: 'Kink-aware, judgment-free',
      niches: ['fetish', 'roleplay', 'solo'], rateCentsPerMin: 425, minMinutes: 5,
      rating: 4.9, ratingsCount: 312, online: true,
      acceptProbability: 0.75, responseTimeSec: 9, color: 'from-slate-700 to-slate-900',
    },
    {
      id: 'cr_sasha', name: 'Sasha Sweet', tagline: 'Flirty chats & slow burns',
      niches: ['chat', 'solo'], rateCentsPerMin: 200, minMinutes: 5,
      rating: 4.6, ratingsCount: 98, online: true,
      acceptProbability: 0.9, responseTimeSec: 5, color: 'from-amber-400 to-rose-400',
    },
    {
      id: 'cr_kai', name: 'Kai', tagline: 'JOI specialist — follow my lead',
      niches: ['joi', 'fetish'], rateCentsPerMin: 600, minMinutes: 10,
      rating: 5.0, ratingsCount: 410, online: true,
      acceptProbability: 0.5, responseTimeSec: 17, color: 'from-emerald-500 to-teal-500',
    },
    {
      id: 'cr_ivy', name: 'Ivy', tagline: 'Off tonight — back tomorrow',
      niches: ['solo', 'chat'], rateCentsPerMin: 250, minMinutes: 5,
      rating: 4.5, ratingsCount: 76, online: false,
      acceptProbability: 0.8, responseTimeSec: 8, color: 'from-sky-400 to-blue-500',
    },
    {
      id: 'cr_roman', name: 'Roman Steel', tagline: 'Roleplay king, zero limits on imagination',
      niches: ['roleplay', 'couples'], rateCentsPerMin: 550, minMinutes: 10,
      rating: 4.8, ratingsCount: 203, online: false,
      acceptProbability: 0.65, responseTimeSec: 12, color: 'from-red-600 to-orange-600',
    },
  ];
}
