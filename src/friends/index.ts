import { Jid, parseJid } from '../helpers/parsers';

interface RosterQueryItem {
  note: string;
  group: {
    '#text': string;
    priority: string;
  };
  id: {
    name: string;
    tagline: string;
  };
  platforms: {
    riot: {
      name: string;
      tagline: string;
    };
  };
  jid: string;
  subscription: 'both' | 'pending_in' | 'pending_out';
  puuid: string;
}

export interface RosterInput {
  from: string;
  to: string;
  type: 'result';
  query: {
    item?: RosterQueryItem[] | RosterQueryItem;
    xmlns: 'jabber:iq:riotgames:roster';
  }
}

export interface RosterOutput {
  sender: Jid;
  recipient: Jid;
  type: string;
  roster: RosterOutputQueryItem[];
  presence: RosterInput;
}


export interface RosterOutputQueryItem {
  jid: Jid;
  puuid: string;
  subscription: 'both' | 'pending_in' | 'pending_out';
  name: string;
  tagline: string;
  note: string;
}

function formatRosterInfo(items: RosterQueryItem[]): RosterOutputQueryItem[] {
  return items.map((m) => {
    return {
      jid: parseJid(m.jid),
      puuid: m.puuid,
      subscription: m.subscription,
      name: m.id?.name,
      tagline: m.id?.tagline,
      note: m.note,
    }
  });
}

export function isRosterIq(data: any): boolean {
  return data?.query?.xmlns === 'jabber:iq:riotgames:roster';
}

export function formatRoster(presence: RosterInput): RosterOutput {
  const { from, to, type, query } = presence;

  const sender = parseJid(from);
  const recipient = parseJid(to);

  const items = query.item == null ? [] : Array.isArray(query.item) ? query.item : [query.item];
  const roster = formatRosterInfo(items);

  return {
    sender,
    recipient,
    type,
    roster,
    presence
  }
}
