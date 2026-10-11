// Shared domain types. Money is always integer cents. Time is epoch ms.

export type NicheId = 'solo' | 'joi' | 'roleplay' | 'couples' | 'chat' | 'fetish';

export interface Creator {
  id: string;
  name: string;
  tagline: string;
  niches: NicheId[];
  rateCentsPerMin: number;
  minMinutes: number;
  rating: number; // 0..5
  ratingsCount: number;
  online: boolean;
  /** mock-sim only: probability a ping is accepted */
  acceptProbability: number;
  /** mock-sim only: seconds before the creator responds */
  responseTimeSec: number;
  /** avatar gradient key */
  color: string;
}

export type RequestMode = 'instant' | 'scheduled';

export type RequestStatus =
  | 'dispatching'
  | 'scheduled'
  | 'matched'
  | 'in_session'
  | 'failed'
  | 'cancelled'
  | 'completed';

export interface BuyerRequest {
  id: string;
  buyerId: string;
  niche: NicheId;
  mode: RequestMode;
  scheduledFor?: number;
  maxMinutes: number;
  budgetCents: number;
  status: RequestStatus;
  createdAt: number;
  attempts: number;
  matchedCreatorId?: string;
  sessionId?: string;
  failReason?: string;
}

export type PingStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface Ping {
  id: string;
  requestId: string;
  creatorId: string;
  status: PingStatus;
  sentAt: number;
  respondBy: number;
  seq: number;
}

export type SessionStatus = 'active' | 'ended';

export interface Session {
  id: string;
  requestId: string;
  buyerId: string;
  creatorId: string;
  rateCentsPerMin: number;
  startedAt: number;
  endedAt?: number;
  status: SessionStatus;
  heldCents: number;
}

export type LedgerType =
  | 'hold'
  | 'capture'
  | 'release'
  | 'tip'
  | 'platform_fee'
  | 'payout';

export interface LedgerEntry {
  seq: number;
  id: string;
  ts: number;
  type: LedgerType;
  sessionId: string;
  /** signed cents from the platform's books perspective */
  amountCents: number;
  memo: string;
}

export interface Report {
  id: string;
  ts: number;
  sessionId?: string;
  reporterRole: 'buyer' | 'creator';
  reason: string;
  detail: string;
  status: 'open' | 'reviewed';
}

export interface SessionAccounting {
  sessionId: string;
  minutes: number;
  rateCentsPerMin: number;
  grossCents: number; // capture + tips
  buyerChargedCents: number;
  platformFeeCents: number;
  creatorNetCents: number;
  releasedCents: number;
}
