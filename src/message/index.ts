import { Jid, parseJid } from '../helpers/parsers';

export interface MessageInput {
	body: string;
	from: string;
	to: string;
	stamp: string;
	id: string;
	type: string;
}

export interface MessageOutput {
	body: string;
	from: Jid;
	to: Jid;
	stamp: string;
	id: string;
	type: string;
}

export function formatMessage(data: MessageInput): MessageOutput {
	const { body, from, to, stamp, id, type } = data;

	return {
		body,
		from: parseJid(from),
		to: parseJid(to),
		stamp,
		id,
		type,
	};
}
