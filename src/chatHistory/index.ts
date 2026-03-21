import { Jid, parseJid } from '../helpers/parsers';

interface RawMessage {
	body: string;
	from: string;
	to: string;
	stamp: string;
	id: string;
	type: string;
}

export interface ChatHistoryInput {
	from: string;
	to: string;
	type: 'result';
	message: RawMessage[];
	reader?: { jid: string; read: string };
}

export interface ChatHistoryMessage {
	body: string;
	from: Jid;
	to: Jid;
	stamp: string;
	id: string;
	type: string;
}

export interface ChatHistoryOutput {
	sender: Jid;
	recipient: Jid;
	messages: ChatHistoryMessage[];
	reader?: { jid: string; read: string };
}

function formatMessages(items: RawMessage[]): ChatHistoryMessage[] {
	return items.map((m) => {
		return {
			body: m.body,
			from: parseJid(m.from),
			to: parseJid(m.to),
			stamp: m.stamp,
			id: m.id,
			type: m.type,
		};
	});
}

export function formatChatHistory(data: ChatHistoryInput): ChatHistoryOutput {
	const { from, to, message, reader } = data;

	const sender = parseJid(from);
	const recipient = parseJid(to);
	const messages = formatMessages(message);

	return {
		sender,
		recipient,
		messages,
		reader,
	};
}
