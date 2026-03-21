import { XmppRegionObject } from '../regions';

export const xmlDeclaration = (region: XmppRegionObject) =>
	`<?xml version="1.0"?><stream:stream to="${region.domain}.pvp.net" version="1.0" xmlns:stream="http://etherx.jabber.org/streams">`;

export const mechanism = (authToken: string, pasToken: string) => ({
	auth: {
		'@_mechanism': 'X-Riot-RSO-PAS',
		'@_xmlns': 'urn:ietf:params:xml:ns:xmpp-sasl',
		rso_token: authToken,
		pas_token: pasToken,
	},
});

export const clientName = () => ({
	iq: {
		'@_id': '_xmpp_bind1',
		'@_type': 'set',
		bind: {
			'@_xmlns': 'urn:ietf:params:xml:ns:xmpp-bind',
			'puuid-mode': {
				'@_enabled': 'true',
			},
			resource: 'RC-VALORANT-NODE',
		},
	},
});

export const setEntitlements = (entitlementsToken: string) => new Object({
	'iq': {
		'@_id': "xmpp_entitlements_0",
		'@_type': "set",
		'entitlements': {
			'@_xmlns': "urn:riotgames:entitlements",
			'token': entitlementsToken
		}
	}
});

export const rxep = () => ({
	iq: {
		'@_id': 'set_rxep_1',
		'@_type': 'set',
		rxcep: {
			'@_xmlns': 'urn:riotgames:rxep',
			'last-online-state': {
				'@_enabled': 'true',
			},
		},
	},
});

export const setupSession = () => ({
	iq: {
		'@_id': '_xmpp_session1',
		'@_type': 'set',
		session: {
			'@_xmlns': 'urn:ietf:params:xml:ns:xmpp-session',
		},
	},
});

export const fetchFriends = () => ({
	iq: {
		'@_type': 'get',
		query: {
			'@_xmlns': 'jabber:iq:riotgames:roster',
		},
	},
});

export const sendFriendRequest = (username: string, tagline: string) => new Object({
	'iq': {
		'@_type': "set",
		'query': {
			'@_xmlns': "jabber:iq:riotgames:roster",
			'item': {
				'@_subscription': "pending_out",
				'id': {
					'@_name': username,
					'@_tagline': tagline
				}
			}
		}
	}
});

export const removeFriendRequest = (puuid: string) => new Object({
	'iq': {
		'@_type': "set",
		'query': {
			'@_xmlns': "jabber:iq:riotgames:roster",
			'item': {
				'@_subscription': "remove",
				'@_puuid': puuid
			}
		}
	}
});

export const presence = (presenceData: any = {}) => ({
	presence: presenceData,
});

export const getArchive = (jid: string) => ({
	iq: {
		'@_type': 'get',
		'@_id': 'get_archive_7',
		query: {
			'@_xmlns': 'jabber:iq:riotgames:archive',
			'with': jid,
		},
	},
});

export const sendChatMessage = (jid: string, message: string) => ({
	message: {
		'@_id': `${Date.now()}:1`,
		'@_to': jid,
		'@_type': 'chat',
		body: message,
	},
});
