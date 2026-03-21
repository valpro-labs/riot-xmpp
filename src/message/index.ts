import { Jid, parseJid } from '../helpers/parsers';

interface ForwardedMessage {
	body: string;
	stamp: string;
	id: string;
	type: string;
}

interface SentCarbonForwardedMessage extends ForwardedMessage {
	to: string;
}

interface ReceivedCarbonForwardedMessage extends ForwardedMessage {
	from: string;
}

export interface MessageInput {
	body: string;
	from: string;
	to: string;
	stamp: string;
	id: string;
	type: string;
}

export interface SentCarbonInput {
	from: string;
	to: string;
	type: string;
	sent: { forwarded: { message: SentCarbonForwardedMessage } };
}

export interface ReceivedCarbonInput {
	from: string;
	to: string;
	type: string;
	received: { forwarded: { message: ReceivedCarbonForwardedMessage } };
}

export interface MessageOutput {
	body: string;
	from: Jid;
	to: Jid;
	stamp: string;
	id: string;
	type: string;
}

function isSentCarbon(data: any): data is SentCarbonInput {
	return !!data?.sent?.forwarded?.message;
}

function isReceivedCarbon(data: any): data is ReceivedCarbonInput {
	return !!data?.received?.forwarded?.message;
}

export function formatMessage(data: MessageInput | SentCarbonInput | ReceivedCarbonInput): MessageOutput {
	if (isSentCarbon(data)) {
		const { message } = data.sent.forwarded;
		return {
			body: message.body,
			from: parseJid(data.from),
			to: parseJid(message.to),
			stamp: message.stamp,
			id: message.id,
			type: message.type,
		};
	}

	if (isReceivedCarbon(data)) {
		const { message } = data.received.forwarded;
		return {
			body: message.body,
			from: parseJid(message.from),
			to: parseJid(data.to),
			stamp: message.stamp,
			id: message.id,
			type: message.type,
		};
	}

	const { body, from, to, stamp, id, type } = data as MessageInput;
	return {
		body,
		from: parseJid(from),
		to: parseJid(to),
		stamp,
		id,
		type,
	};
}
