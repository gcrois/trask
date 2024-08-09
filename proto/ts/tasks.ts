// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// versions:
//   protoc-gen-ts_proto  v1.181.0
//   protoc               v5.27.1
// source: tasks.proto

/* eslint-disable */
import * as _m0 from "protobufjs/minimal";

export const protobufPackage = "tasks";

export interface Text2textRequest {
	messages: string[];
	maxTokens: number;
	client: string;
}

export interface Text2imageRequest {
	prompt: string;
	n: number;
	size: string;
	client: string;
}

export interface Text2textResponse {
	result: string;
}

export interface Text2imageResponse {
	result: string;
}

export interface TaskRequest {
	text2text?: Text2textRequest | undefined;
	text2image?: Text2imageRequest | undefined;
}

export interface TaskResponse {
	text2text?: Text2textResponse | undefined;
	text2image?: Text2imageResponse | undefined;
}

function createBaseText2textRequest(): Text2textRequest {
	return { messages: [], maxTokens: 0, client: "" };
}

export const Text2textRequest = {
	encode(
		message: Text2textRequest,
		writer: _m0.Writer = _m0.Writer.create(),
	): _m0.Writer {
		for (const v of message.messages) {
			writer.uint32(10).string(v!);
		}
		if (message.maxTokens !== 0) {
			writer.uint32(16).int32(message.maxTokens);
		}
		if (message.client !== "") {
			writer.uint32(26).string(message.client);
		}
		return writer;
	},

	decode(input: _m0.Reader | Uint8Array, length?: number): Text2textRequest {
		const reader =
			input instanceof _m0.Reader ? input : _m0.Reader.create(input);
		let end = length === undefined ? reader.len : reader.pos + length;
		const message = createBaseText2textRequest();
		while (reader.pos < end) {
			const tag = reader.uint32();
			switch (tag >>> 3) {
				case 1:
					if (tag !== 10) {
						break;
					}

					message.messages.push(reader.string());
					continue;
				case 2:
					if (tag !== 16) {
						break;
					}

					message.maxTokens = reader.int32();
					continue;
				case 3:
					if (tag !== 26) {
						break;
					}

					message.client = reader.string();
					continue;
			}
			if ((tag & 7) === 4 || tag === 0) {
				break;
			}
			reader.skipType(tag & 7);
		}
		return message;
	},

	fromJSON(object: any): Text2textRequest {
		return {
			messages: globalThis.Array.isArray(object?.messages)
				? object.messages.map((e: any) => globalThis.String(e))
				: [],
			maxTokens: isSet(object.maxTokens)
				? globalThis.Number(object.maxTokens)
				: 0,
			client: isSet(object.client)
				? globalThis.String(object.client)
				: "",
		};
	},

	toJSON(message: Text2textRequest): unknown {
		const obj: any = {};
		if (message.messages?.length) {
			obj.messages = message.messages;
		}
		if (message.maxTokens !== 0) {
			obj.maxTokens = Math.round(message.maxTokens);
		}
		if (message.client !== "") {
			obj.client = message.client;
		}
		return obj;
	},

	create<I extends Exact<DeepPartial<Text2textRequest>, I>>(
		base?: I,
	): Text2textRequest {
		return Text2textRequest.fromPartial(base ?? ({} as any));
	},
	fromPartial<I extends Exact<DeepPartial<Text2textRequest>, I>>(
		object: I,
	): Text2textRequest {
		const message = createBaseText2textRequest();
		message.messages = object.messages?.map((e) => e) || [];
		message.maxTokens = object.maxTokens ?? 0;
		message.client = object.client ?? "";
		return message;
	},
};

function createBaseText2imageRequest(): Text2imageRequest {
	return { prompt: "", n: 0, size: "", client: "" };
}

export const Text2imageRequest = {
	encode(
		message: Text2imageRequest,
		writer: _m0.Writer = _m0.Writer.create(),
	): _m0.Writer {
		if (message.prompt !== "") {
			writer.uint32(10).string(message.prompt);
		}
		if (message.n !== 0) {
			writer.uint32(16).int32(message.n);
		}
		if (message.size !== "") {
			writer.uint32(26).string(message.size);
		}
		if (message.client !== "") {
			writer.uint32(34).string(message.client);
		}
		return writer;
	},

	decode(input: _m0.Reader | Uint8Array, length?: number): Text2imageRequest {
		const reader =
			input instanceof _m0.Reader ? input : _m0.Reader.create(input);
		let end = length === undefined ? reader.len : reader.pos + length;
		const message = createBaseText2imageRequest();
		while (reader.pos < end) {
			const tag = reader.uint32();
			switch (tag >>> 3) {
				case 1:
					if (tag !== 10) {
						break;
					}

					message.prompt = reader.string();
					continue;
				case 2:
					if (tag !== 16) {
						break;
					}

					message.n = reader.int32();
					continue;
				case 3:
					if (tag !== 26) {
						break;
					}

					message.size = reader.string();
					continue;
				case 4:
					if (tag !== 34) {
						break;
					}

					message.client = reader.string();
					continue;
			}
			if ((tag & 7) === 4 || tag === 0) {
				break;
			}
			reader.skipType(tag & 7);
		}
		return message;
	},

	fromJSON(object: any): Text2imageRequest {
		return {
			prompt: isSet(object.prompt)
				? globalThis.String(object.prompt)
				: "",
			n: isSet(object.n) ? globalThis.Number(object.n) : 0,
			size: isSet(object.size) ? globalThis.String(object.size) : "",
			client: isSet(object.client)
				? globalThis.String(object.client)
				: "",
		};
	},

	toJSON(message: Text2imageRequest): unknown {
		const obj: any = {};
		if (message.prompt !== "") {
			obj.prompt = message.prompt;
		}
		if (message.n !== 0) {
			obj.n = Math.round(message.n);
		}
		if (message.size !== "") {
			obj.size = message.size;
		}
		if (message.client !== "") {
			obj.client = message.client;
		}
		return obj;
	},

	create<I extends Exact<DeepPartial<Text2imageRequest>, I>>(
		base?: I,
	): Text2imageRequest {
		return Text2imageRequest.fromPartial(base ?? ({} as any));
	},
	fromPartial<I extends Exact<DeepPartial<Text2imageRequest>, I>>(
		object: I,
	): Text2imageRequest {
		const message = createBaseText2imageRequest();
		message.prompt = object.prompt ?? "";
		message.n = object.n ?? 0;
		message.size = object.size ?? "";
		message.client = object.client ?? "";
		return message;
	},
};

function createBaseText2textResponse(): Text2textResponse {
	return { result: "" };
}

export const Text2textResponse = {
	encode(
		message: Text2textResponse,
		writer: _m0.Writer = _m0.Writer.create(),
	): _m0.Writer {
		if (message.result !== "") {
			writer.uint32(10).string(message.result);
		}
		return writer;
	},

	decode(input: _m0.Reader | Uint8Array, length?: number): Text2textResponse {
		const reader =
			input instanceof _m0.Reader ? input : _m0.Reader.create(input);
		let end = length === undefined ? reader.len : reader.pos + length;
		const message = createBaseText2textResponse();
		while (reader.pos < end) {
			const tag = reader.uint32();
			switch (tag >>> 3) {
				case 1:
					if (tag !== 10) {
						break;
					}

					message.result = reader.string();
					continue;
			}
			if ((tag & 7) === 4 || tag === 0) {
				break;
			}
			reader.skipType(tag & 7);
		}
		return message;
	},

	fromJSON(object: any): Text2textResponse {
		return {
			result: isSet(object.result)
				? globalThis.String(object.result)
				: "",
		};
	},

	toJSON(message: Text2textResponse): unknown {
		const obj: any = {};
		if (message.result !== "") {
			obj.result = message.result;
		}
		return obj;
	},

	create<I extends Exact<DeepPartial<Text2textResponse>, I>>(
		base?: I,
	): Text2textResponse {
		return Text2textResponse.fromPartial(base ?? ({} as any));
	},
	fromPartial<I extends Exact<DeepPartial<Text2textResponse>, I>>(
		object: I,
	): Text2textResponse {
		const message = createBaseText2textResponse();
		message.result = object.result ?? "";
		return message;
	},
};

function createBaseText2imageResponse(): Text2imageResponse {
	return { result: "" };
}

export const Text2imageResponse = {
	encode(
		message: Text2imageResponse,
		writer: _m0.Writer = _m0.Writer.create(),
	): _m0.Writer {
		if (message.result !== "") {
			writer.uint32(10).string(message.result);
		}
		return writer;
	},

	decode(
		input: _m0.Reader | Uint8Array,
		length?: number,
	): Text2imageResponse {
		const reader =
			input instanceof _m0.Reader ? input : _m0.Reader.create(input);
		let end = length === undefined ? reader.len : reader.pos + length;
		const message = createBaseText2imageResponse();
		while (reader.pos < end) {
			const tag = reader.uint32();
			switch (tag >>> 3) {
				case 1:
					if (tag !== 10) {
						break;
					}

					message.result = reader.string();
					continue;
			}
			if ((tag & 7) === 4 || tag === 0) {
				break;
			}
			reader.skipType(tag & 7);
		}
		return message;
	},

	fromJSON(object: any): Text2imageResponse {
		return {
			result: isSet(object.result)
				? globalThis.String(object.result)
				: "",
		};
	},

	toJSON(message: Text2imageResponse): unknown {
		const obj: any = {};
		if (message.result !== "") {
			obj.result = message.result;
		}
		return obj;
	},

	create<I extends Exact<DeepPartial<Text2imageResponse>, I>>(
		base?: I,
	): Text2imageResponse {
		return Text2imageResponse.fromPartial(base ?? ({} as any));
	},
	fromPartial<I extends Exact<DeepPartial<Text2imageResponse>, I>>(
		object: I,
	): Text2imageResponse {
		const message = createBaseText2imageResponse();
		message.result = object.result ?? "";
		return message;
	},
};

function createBaseTaskRequest(): TaskRequest {
	return { text2text: undefined, text2image: undefined };
}

export const TaskRequest = {
	encode(
		message: TaskRequest,
		writer: _m0.Writer = _m0.Writer.create(),
	): _m0.Writer {
		if (message.text2text !== undefined) {
			Text2textRequest.encode(
				message.text2text,
				writer.uint32(10).fork(),
			).ldelim();
		}
		if (message.text2image !== undefined) {
			Text2imageRequest.encode(
				message.text2image,
				writer.uint32(18).fork(),
			).ldelim();
		}
		return writer;
	},

	decode(input: _m0.Reader | Uint8Array, length?: number): TaskRequest {
		const reader =
			input instanceof _m0.Reader ? input : _m0.Reader.create(input);
		let end = length === undefined ? reader.len : reader.pos + length;
		const message = createBaseTaskRequest();
		while (reader.pos < end) {
			const tag = reader.uint32();
			switch (tag >>> 3) {
				case 1:
					if (tag !== 10) {
						break;
					}

					message.text2text = Text2textRequest.decode(
						reader,
						reader.uint32(),
					);
					continue;
				case 2:
					if (tag !== 18) {
						break;
					}

					message.text2image = Text2imageRequest.decode(
						reader,
						reader.uint32(),
					);
					continue;
			}
			if ((tag & 7) === 4 || tag === 0) {
				break;
			}
			reader.skipType(tag & 7);
		}
		return message;
	},

	fromJSON(object: any): TaskRequest {
		return {
			text2text: isSet(object.text2text)
				? Text2textRequest.fromJSON(object.text2text)
				: undefined,
			text2image: isSet(object.text2image)
				? Text2imageRequest.fromJSON(object.text2image)
				: undefined,
		};
	},

	toJSON(message: TaskRequest): unknown {
		const obj: any = {};
		if (message.text2text !== undefined) {
			obj.text2text = Text2textRequest.toJSON(message.text2text);
		}
		if (message.text2image !== undefined) {
			obj.text2image = Text2imageRequest.toJSON(message.text2image);
		}
		return obj;
	},

	create<I extends Exact<DeepPartial<TaskRequest>, I>>(
		base?: I,
	): TaskRequest {
		return TaskRequest.fromPartial(base ?? ({} as any));
	},
	fromPartial<I extends Exact<DeepPartial<TaskRequest>, I>>(
		object: I,
	): TaskRequest {
		const message = createBaseTaskRequest();
		message.text2text =
			object.text2text !== undefined && object.text2text !== null
				? Text2textRequest.fromPartial(object.text2text)
				: undefined;
		message.text2image =
			object.text2image !== undefined && object.text2image !== null
				? Text2imageRequest.fromPartial(object.text2image)
				: undefined;
		return message;
	},
};

function createBaseTaskResponse(): TaskResponse {
	return { text2text: undefined, text2image: undefined };
}

export const TaskResponse = {
	encode(
		message: TaskResponse,
		writer: _m0.Writer = _m0.Writer.create(),
	): _m0.Writer {
		if (message.text2text !== undefined) {
			Text2textResponse.encode(
				message.text2text,
				writer.uint32(10).fork(),
			).ldelim();
		}
		if (message.text2image !== undefined) {
			Text2imageResponse.encode(
				message.text2image,
				writer.uint32(18).fork(),
			).ldelim();
		}
		return writer;
	},

	decode(input: _m0.Reader | Uint8Array, length?: number): TaskResponse {
		const reader =
			input instanceof _m0.Reader ? input : _m0.Reader.create(input);
		let end = length === undefined ? reader.len : reader.pos + length;
		const message = createBaseTaskResponse();
		while (reader.pos < end) {
			const tag = reader.uint32();
			switch (tag >>> 3) {
				case 1:
					if (tag !== 10) {
						break;
					}

					message.text2text = Text2textResponse.decode(
						reader,
						reader.uint32(),
					);
					continue;
				case 2:
					if (tag !== 18) {
						break;
					}

					message.text2image = Text2imageResponse.decode(
						reader,
						reader.uint32(),
					);
					continue;
			}
			if ((tag & 7) === 4 || tag === 0) {
				break;
			}
			reader.skipType(tag & 7);
		}
		return message;
	},

	fromJSON(object: any): TaskResponse {
		return {
			text2text: isSet(object.text2text)
				? Text2textResponse.fromJSON(object.text2text)
				: undefined,
			text2image: isSet(object.text2image)
				? Text2imageResponse.fromJSON(object.text2image)
				: undefined,
		};
	},

	toJSON(message: TaskResponse): unknown {
		const obj: any = {};
		if (message.text2text !== undefined) {
			obj.text2text = Text2textResponse.toJSON(message.text2text);
		}
		if (message.text2image !== undefined) {
			obj.text2image = Text2imageResponse.toJSON(message.text2image);
		}
		return obj;
	},

	create<I extends Exact<DeepPartial<TaskResponse>, I>>(
		base?: I,
	): TaskResponse {
		return TaskResponse.fromPartial(base ?? ({} as any));
	},
	fromPartial<I extends Exact<DeepPartial<TaskResponse>, I>>(
		object: I,
	): TaskResponse {
		const message = createBaseTaskResponse();
		message.text2text =
			object.text2text !== undefined && object.text2text !== null
				? Text2textResponse.fromPartial(object.text2text)
				: undefined;
		message.text2image =
			object.text2image !== undefined && object.text2image !== null
				? Text2imageResponse.fromPartial(object.text2image)
				: undefined;
		return message;
	},
};

type Builtin =
	| Date
	| Function
	| Uint8Array
	| string
	| number
	| boolean
	| undefined;

export type DeepPartial<T> = T extends Builtin
	? T
	: T extends globalThis.Array<infer U>
		? globalThis.Array<DeepPartial<U>>
		: T extends ReadonlyArray<infer U>
			? ReadonlyArray<DeepPartial<U>>
			: T extends {}
				? { [K in keyof T]?: DeepPartial<T[K]> }
				: Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin
	? P
	: P & { [K in keyof P]: Exact<P[K], I[K]> } & {
			[K in Exclude<keyof I, KeysOfUnion<P>>]: never;
		};

function isSet(value: any): boolean {
	return value !== null && value !== undefined;
}
