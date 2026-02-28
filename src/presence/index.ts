import { decode } from 'js-base64';

import { Jid, parseJid } from '../helpers/parsers';

export interface PresenceInput {
  from: string;
  to: string;
  show?: string;
  type?: string;
  games?: PresenceGames;
  status?: string;
  platform?: string;
  id?: string;
  [propName: string]: any;
}

export interface PresenceGames {
  keystone?: KeystonePresence;
  valorant?: ValorantPresence;
  riot_client?: RiotClientPresence;
  [gameName: string]: any;
}

export interface KeystonePresence {
  st: string;
  's.t': number;
  m: string;
  's.p': string;
  pty: string;
}

export interface ValorantPresence {
  's.r': string;
  st: string;
  p: string;
  's.p': string;
  's.t': number;
  pty: string;
}

export interface RiotClientPresence {
  's.r': string;
  st: string;
  's.t': number;
  m: string;
  p: string;
  pd: string; // Base64 encoded RiotClientPresenceData
  's.p': string;
  's.c': string;
  pty: string;
}

export type SessionLoopState = 'MENUS' | 'PREGAME' | 'INGAME';

export type ProvisioningFlow =
  | 'CustomGame'
  | 'SkillTest'
  | 'Matchmaking'
  | 'NewPlayerExperience'
  | 'Invalid';

export type QueueId =
  | 'spikerush'
  | 'competitive'
  | 'deathmatch'
  | 'unrated'
  | 'snowball'
  | '';

export type PartyState =
  | 'DEFAULT'
  | 'CUSTOM_GAME_SETUP'
  | 'CUSTOM_GAME_STARTING'
  | 'MATCHMAKING'
  | 'STARTING_MATCHMAKING'
  | 'LEAVING_MATCHMAKING'
  | 'MATCHMADE_GAME_STARTING'
  | 'SOLO_EXPERIENCE_STARTING';

export type PartyAccessibility = 'CLOSED' | 'OPEN';

export type CustomGameTeam = 'TeamOne' | 'TeamTwo' | 'TeamSpectate';

export type MatchTeam = 'Blue' | 'Red';

/**
 * Decoded content of ValorantPresence['p']
 */
export interface ValorantPresenceData {
  isValid: boolean;
  isIdle: boolean;
  queueId: QueueId;
  provisioningFlow: ProvisioningFlow;
  partyId: string;
  partySize: number;
  maxPartySize: number;
  partyOwnerMatchScoreAllyTeam: number;
  partyOwnerMatchScoreEnemyTeam: number;
  premierPresenceData: PremierPresenceData;
  matchPresenceData: MatchPresenceData;
  partyPresenceData: PartyPresenceData;
  playerPresenceData: PlayerPresenceData;
}

/**
 * Decoded content of RiotClientPresence['pd']
 */
export interface RiotClientPresenceData {
  crossPlayPermissions: {
    hasPartyCrossPlayEnabled: boolean;
    hasPlayerCrossPlayEnabled: boolean;
    isInParty: boolean;
    partyMemberPlatforms: string[];
  };
  player: {
    crossPlay: boolean;
    profileBanner: string;
    profileIcon: string;
    state: string;
  };
  region: string;
}

export interface PremierPresenceData {
  rosterId: string;
  rosterName: string;
  rosterTag: string;
  rosterType: string;
  division: number;
  score: number;
  plating: number;
  showAura: boolean;
  showTag: boolean;
  showPlating: boolean;
}

export interface MatchPresenceData {
  sessionLoopState: SessionLoopState;
  provisioningFlow: ProvisioningFlow;
  matchMap: string;
  queueId: QueueId;
}

export interface PartyPresenceData {
  partyId: string;
  partyName: string;
  isPartyOwner: boolean;
  partyState: PartyState;
  partyAccessibility: PartyAccessibility;
  partyLFM: boolean;
  partyClientVersion: string;
  partyVersion: number;
  partySize: number;
  queueEntryTime: string;
  isPartyCrossPlayEnabled: boolean;
  isPlayerCrossPlayEnabled: boolean;
  partyPrecisePlatformTypes: number;
  customGameName: CustomGameTeam | '';
  customGameTeam: CustomGameTeam | '';
  maxPartySize: number;
  tournamentId: string;
  rosterId: string;
  partyOwnerSessionLoopState: SessionLoopState;
  partyOwnerMatchMap: string;
  partyOwnerMatchCurrentTeam: MatchTeam;
  partyOwnerProvisioningFlow: ProvisioningFlow;
  partyOwnerMatchScoreAllyTeam: number;
  partyOwnerMatchScoreEnemyTeam: number;
}

export interface PlayerPresenceData {
  playerCardId: string;
  playerTitleId: string;
  accountLevel: number;
  competitiveTier: number;
  leaderboardPosition: number;
}

export interface PresenceOutput {
  sender: Jid;
  recipient: Jid;
  show?: string;
  status?: string;
  platform?: string;
  id?: string;
  valorantData: ValorantPresenceData | null;
  riotClientData: RiotClientPresenceData | null;
}

function decodeBase64Json<T>(p: string | undefined): T | null {
  if (!p) return null;
  try {
    const decodedString = decode(p);
    return JSON.parse(decodedString);
  } catch (e) {
    console.error('Error decoding base64 json:', e);
    return null;
  }
}

export function formatPresence(presence: PresenceInput): PresenceOutput {
  const { from, to, games, show, status, platform, id } = presence;

  const sender = parseJid(from);
  const recipient = parseJid(to);

  const valorantData = decodeBase64Json<ValorantPresenceData>(games?.valorant?.p);
  const riotClientData = decodeBase64Json<RiotClientPresenceData>(games?.riot_client?.pd);

  return {
    sender,
    recipient,
    show,
    status,
    platform,
    id,
    valorantData,
    riotClientData
  };
}
