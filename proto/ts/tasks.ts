// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// versions:
//   protoc-gen-ts_proto  v1.181.1
//   protoc               v3.21.12
// source: tasks.proto

/* eslint-disable */
import _m0 from "protobufjs/minimal";
import { File } from "./definitions";

export const protobufPackage = "";

/**
 * Ignored parameters:
 * send_update: typing.Any
 */
export interface Text2imageRequest {
  prompt: string;
  size: string;
  seed: number;
}

export interface Text2imageResponse {
  result: File | undefined;
}

/**
 * Ignored parameters:
 * send_update: <class 'inspect._empty'>
 */
export interface CapitalizeRequest {
  text: string;
}

export interface CapitalizeResponse {
  result: string;
}

/**
 * Ignored parameters:
 * client: <class 'inspect._empty'>
 * send_update: typing.Callable[[str], typing.Awaitable[typing.Literal['success']]]
 */
export interface Text2textRequest {
  roles: string[];
  messages: string[];
  maxTokens: number;
}

export interface Text2textResponse {
  result: string;
}

/**
 * Ignored parameters:
 * send_update: typing.Any
 */
export interface Text2audioRequest {
  prompt: string;
  duration: number;
  steps: number;
  cfgScale: number;
}

export interface Text2audioResponse {
  result: File | undefined;
}

/**
 * Ignored parameters:
 * client: <class 'inspect._empty'>
 * send_update: typing.Callable[[str], typing.Awaitable[NoneType]]
 */
export interface File2textRequest {
  file: File | undefined;
  maxTokens: number;
}

export interface File2textResponse {
  result: string;
}

/**
 * Ignored parameters:
 * send_update: <class 'inspect._empty'>
 */
export interface Text2imagefileRequest {
  prompt: string;
}

export interface Text2imagefileResponse {
  result: File | undefined;
}

export interface TaskRequest {
  text2image?: Text2imageRequest | undefined;
  capitalize?: CapitalizeRequest | undefined;
  text2text?: Text2textRequest | undefined;
  text2audio?: Text2audioRequest | undefined;
  file2text?: File2textRequest | undefined;
  text2imagefile?: Text2imagefileRequest | undefined;
}

export interface TaskResponse {
  text2image?: Text2imageResponse | undefined;
  capitalize?: CapitalizeResponse | undefined;
  text2text?: Text2textResponse | undefined;
  text2audio?: Text2audioResponse | undefined;
  file2text?: File2textResponse | undefined;
  text2imagefile?: Text2imagefileResponse | undefined;
}

function createBaseText2imageRequest(): Text2imageRequest {
  return { prompt: "", size: "", seed: 0 };
}

export const Text2imageRequest = {
  encode(message: Text2imageRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.prompt !== "") {
      writer.uint32(10).string(message.prompt);
    }
    if (message.size !== "") {
      writer.uint32(18).string(message.size);
    }
    if (message.seed !== 0) {
      writer.uint32(24).int32(message.seed);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Text2imageRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
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
          if (tag !== 18) {
            break;
          }

          message.size = reader.string();
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.seed = reader.int32();
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
      prompt: isSet(object.prompt) ? globalThis.String(object.prompt) : "",
      size: isSet(object.size) ? globalThis.String(object.size) : "",
      seed: isSet(object.seed) ? globalThis.Number(object.seed) : 0,
    };
  },

  toJSON(message: Text2imageRequest): unknown {
    const obj: any = {};
    if (message.prompt !== "") {
      obj.prompt = message.prompt;
    }
    if (message.size !== "") {
      obj.size = message.size;
    }
    if (message.seed !== 0) {
      obj.seed = Math.round(message.seed);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Text2imageRequest>, I>>(base?: I): Text2imageRequest {
    return Text2imageRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Text2imageRequest>, I>>(object: I): Text2imageRequest {
    const message = createBaseText2imageRequest();
    message.prompt = object.prompt ?? "";
    message.size = object.size ?? "";
    message.seed = object.seed ?? 0;
    return message;
  },
};

function createBaseText2imageResponse(): Text2imageResponse {
  return { result: undefined };
}

export const Text2imageResponse = {
  encode(message: Text2imageResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.result !== undefined) {
      File.encode(message.result, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Text2imageResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseText2imageResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.result = File.decode(reader, reader.uint32());
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
    return { result: isSet(object.result) ? File.fromJSON(object.result) : undefined };
  },

  toJSON(message: Text2imageResponse): unknown {
    const obj: any = {};
    if (message.result !== undefined) {
      obj.result = File.toJSON(message.result);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Text2imageResponse>, I>>(base?: I): Text2imageResponse {
    return Text2imageResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Text2imageResponse>, I>>(object: I): Text2imageResponse {
    const message = createBaseText2imageResponse();
    message.result = (object.result !== undefined && object.result !== null)
      ? File.fromPartial(object.result)
      : undefined;
    return message;
  },
};

function createBaseCapitalizeRequest(): CapitalizeRequest {
  return { text: "" };
}

export const CapitalizeRequest = {
  encode(message: CapitalizeRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.text !== "") {
      writer.uint32(10).string(message.text);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): CapitalizeRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCapitalizeRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.text = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): CapitalizeRequest {
    return { text: isSet(object.text) ? globalThis.String(object.text) : "" };
  },

  toJSON(message: CapitalizeRequest): unknown {
    const obj: any = {};
    if (message.text !== "") {
      obj.text = message.text;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<CapitalizeRequest>, I>>(base?: I): CapitalizeRequest {
    return CapitalizeRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<CapitalizeRequest>, I>>(object: I): CapitalizeRequest {
    const message = createBaseCapitalizeRequest();
    message.text = object.text ?? "";
    return message;
  },
};

function createBaseCapitalizeResponse(): CapitalizeResponse {
  return { result: "" };
}

export const CapitalizeResponse = {
  encode(message: CapitalizeResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.result !== "") {
      writer.uint32(10).string(message.result);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): CapitalizeResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCapitalizeResponse();
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

  fromJSON(object: any): CapitalizeResponse {
    return { result: isSet(object.result) ? globalThis.String(object.result) : "" };
  },

  toJSON(message: CapitalizeResponse): unknown {
    const obj: any = {};
    if (message.result !== "") {
      obj.result = message.result;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<CapitalizeResponse>, I>>(base?: I): CapitalizeResponse {
    return CapitalizeResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<CapitalizeResponse>, I>>(object: I): CapitalizeResponse {
    const message = createBaseCapitalizeResponse();
    message.result = object.result ?? "";
    return message;
  },
};

function createBaseText2textRequest(): Text2textRequest {
  return { roles: [], messages: [], maxTokens: 0 };
}

export const Text2textRequest = {
  encode(message: Text2textRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.roles) {
      writer.uint32(10).string(v!);
    }
    for (const v of message.messages) {
      writer.uint32(18).string(v!);
    }
    if (message.maxTokens !== 0) {
      writer.uint32(24).int32(message.maxTokens);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Text2textRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseText2textRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.roles.push(reader.string());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.messages.push(reader.string());
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.maxTokens = reader.int32();
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
      roles: globalThis.Array.isArray(object?.roles) ? object.roles.map((e: any) => globalThis.String(e)) : [],
      messages: globalThis.Array.isArray(object?.messages) ? object.messages.map((e: any) => globalThis.String(e)) : [],
      maxTokens: isSet(object.maxTokens) ? globalThis.Number(object.maxTokens) : 0,
    };
  },

  toJSON(message: Text2textRequest): unknown {
    const obj: any = {};
    if (message.roles?.length) {
      obj.roles = message.roles;
    }
    if (message.messages?.length) {
      obj.messages = message.messages;
    }
    if (message.maxTokens !== 0) {
      obj.maxTokens = Math.round(message.maxTokens);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Text2textRequest>, I>>(base?: I): Text2textRequest {
    return Text2textRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Text2textRequest>, I>>(object: I): Text2textRequest {
    const message = createBaseText2textRequest();
    message.roles = object.roles?.map((e) => e) || [];
    message.messages = object.messages?.map((e) => e) || [];
    message.maxTokens = object.maxTokens ?? 0;
    return message;
  },
};

function createBaseText2textResponse(): Text2textResponse {
  return { result: "" };
}

export const Text2textResponse = {
  encode(message: Text2textResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.result !== "") {
      writer.uint32(10).string(message.result);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Text2textResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
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
    return { result: isSet(object.result) ? globalThis.String(object.result) : "" };
  },

  toJSON(message: Text2textResponse): unknown {
    const obj: any = {};
    if (message.result !== "") {
      obj.result = message.result;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Text2textResponse>, I>>(base?: I): Text2textResponse {
    return Text2textResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Text2textResponse>, I>>(object: I): Text2textResponse {
    const message = createBaseText2textResponse();
    message.result = object.result ?? "";
    return message;
  },
};

function createBaseText2audioRequest(): Text2audioRequest {
  return { prompt: "", duration: 0, steps: 0, cfgScale: 0 };
}

export const Text2audioRequest = {
  encode(message: Text2audioRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.prompt !== "") {
      writer.uint32(10).string(message.prompt);
    }
    if (message.duration !== 0) {
      writer.uint32(16).int32(message.duration);
    }
    if (message.steps !== 0) {
      writer.uint32(24).int32(message.steps);
    }
    if (message.cfgScale !== 0) {
      writer.uint32(37).float(message.cfgScale);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Text2audioRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseText2audioRequest();
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

          message.duration = reader.int32();
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.steps = reader.int32();
          continue;
        case 4:
          if (tag !== 37) {
            break;
          }

          message.cfgScale = reader.float();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Text2audioRequest {
    return {
      prompt: isSet(object.prompt) ? globalThis.String(object.prompt) : "",
      duration: isSet(object.duration) ? globalThis.Number(object.duration) : 0,
      steps: isSet(object.steps) ? globalThis.Number(object.steps) : 0,
      cfgScale: isSet(object.cfgScale) ? globalThis.Number(object.cfgScale) : 0,
    };
  },

  toJSON(message: Text2audioRequest): unknown {
    const obj: any = {};
    if (message.prompt !== "") {
      obj.prompt = message.prompt;
    }
    if (message.duration !== 0) {
      obj.duration = Math.round(message.duration);
    }
    if (message.steps !== 0) {
      obj.steps = Math.round(message.steps);
    }
    if (message.cfgScale !== 0) {
      obj.cfgScale = message.cfgScale;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Text2audioRequest>, I>>(base?: I): Text2audioRequest {
    return Text2audioRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Text2audioRequest>, I>>(object: I): Text2audioRequest {
    const message = createBaseText2audioRequest();
    message.prompt = object.prompt ?? "";
    message.duration = object.duration ?? 0;
    message.steps = object.steps ?? 0;
    message.cfgScale = object.cfgScale ?? 0;
    return message;
  },
};

function createBaseText2audioResponse(): Text2audioResponse {
  return { result: undefined };
}

export const Text2audioResponse = {
  encode(message: Text2audioResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.result !== undefined) {
      File.encode(message.result, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Text2audioResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseText2audioResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.result = File.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Text2audioResponse {
    return { result: isSet(object.result) ? File.fromJSON(object.result) : undefined };
  },

  toJSON(message: Text2audioResponse): unknown {
    const obj: any = {};
    if (message.result !== undefined) {
      obj.result = File.toJSON(message.result);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Text2audioResponse>, I>>(base?: I): Text2audioResponse {
    return Text2audioResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Text2audioResponse>, I>>(object: I): Text2audioResponse {
    const message = createBaseText2audioResponse();
    message.result = (object.result !== undefined && object.result !== null)
      ? File.fromPartial(object.result)
      : undefined;
    return message;
  },
};

function createBaseFile2textRequest(): File2textRequest {
  return { file: undefined, maxTokens: 0 };
}

export const File2textRequest = {
  encode(message: File2textRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.file !== undefined) {
      File.encode(message.file, writer.uint32(10).fork()).ldelim();
    }
    if (message.maxTokens !== 0) {
      writer.uint32(16).int32(message.maxTokens);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): File2textRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseFile2textRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.file = File.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.maxTokens = reader.int32();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): File2textRequest {
    return {
      file: isSet(object.file) ? File.fromJSON(object.file) : undefined,
      maxTokens: isSet(object.maxTokens) ? globalThis.Number(object.maxTokens) : 0,
    };
  },

  toJSON(message: File2textRequest): unknown {
    const obj: any = {};
    if (message.file !== undefined) {
      obj.file = File.toJSON(message.file);
    }
    if (message.maxTokens !== 0) {
      obj.maxTokens = Math.round(message.maxTokens);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<File2textRequest>, I>>(base?: I): File2textRequest {
    return File2textRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<File2textRequest>, I>>(object: I): File2textRequest {
    const message = createBaseFile2textRequest();
    message.file = (object.file !== undefined && object.file !== null) ? File.fromPartial(object.file) : undefined;
    message.maxTokens = object.maxTokens ?? 0;
    return message;
  },
};

function createBaseFile2textResponse(): File2textResponse {
  return { result: "" };
}

export const File2textResponse = {
  encode(message: File2textResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.result !== "") {
      writer.uint32(10).string(message.result);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): File2textResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseFile2textResponse();
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

  fromJSON(object: any): File2textResponse {
    return { result: isSet(object.result) ? globalThis.String(object.result) : "" };
  },

  toJSON(message: File2textResponse): unknown {
    const obj: any = {};
    if (message.result !== "") {
      obj.result = message.result;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<File2textResponse>, I>>(base?: I): File2textResponse {
    return File2textResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<File2textResponse>, I>>(object: I): File2textResponse {
    const message = createBaseFile2textResponse();
    message.result = object.result ?? "";
    return message;
  },
};

function createBaseText2imagefileRequest(): Text2imagefileRequest {
  return { prompt: "" };
}

export const Text2imagefileRequest = {
  encode(message: Text2imagefileRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.prompt !== "") {
      writer.uint32(10).string(message.prompt);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Text2imagefileRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseText2imagefileRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.prompt = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Text2imagefileRequest {
    return { prompt: isSet(object.prompt) ? globalThis.String(object.prompt) : "" };
  },

  toJSON(message: Text2imagefileRequest): unknown {
    const obj: any = {};
    if (message.prompt !== "") {
      obj.prompt = message.prompt;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Text2imagefileRequest>, I>>(base?: I): Text2imagefileRequest {
    return Text2imagefileRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Text2imagefileRequest>, I>>(object: I): Text2imagefileRequest {
    const message = createBaseText2imagefileRequest();
    message.prompt = object.prompt ?? "";
    return message;
  },
};

function createBaseText2imagefileResponse(): Text2imagefileResponse {
  return { result: undefined };
}

export const Text2imagefileResponse = {
  encode(message: Text2imagefileResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.result !== undefined) {
      File.encode(message.result, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Text2imagefileResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseText2imagefileResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.result = File.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Text2imagefileResponse {
    return { result: isSet(object.result) ? File.fromJSON(object.result) : undefined };
  },

  toJSON(message: Text2imagefileResponse): unknown {
    const obj: any = {};
    if (message.result !== undefined) {
      obj.result = File.toJSON(message.result);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Text2imagefileResponse>, I>>(base?: I): Text2imagefileResponse {
    return Text2imagefileResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Text2imagefileResponse>, I>>(object: I): Text2imagefileResponse {
    const message = createBaseText2imagefileResponse();
    message.result = (object.result !== undefined && object.result !== null)
      ? File.fromPartial(object.result)
      : undefined;
    return message;
  },
};

function createBaseTaskRequest(): TaskRequest {
  return {
    text2image: undefined,
    capitalize: undefined,
    text2text: undefined,
    text2audio: undefined,
    file2text: undefined,
    text2imagefile: undefined,
  };
}

export const TaskRequest = {
  encode(message: TaskRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.text2image !== undefined) {
      Text2imageRequest.encode(message.text2image, writer.uint32(10).fork()).ldelim();
    }
    if (message.capitalize !== undefined) {
      CapitalizeRequest.encode(message.capitalize, writer.uint32(18).fork()).ldelim();
    }
    if (message.text2text !== undefined) {
      Text2textRequest.encode(message.text2text, writer.uint32(26).fork()).ldelim();
    }
    if (message.text2audio !== undefined) {
      Text2audioRequest.encode(message.text2audio, writer.uint32(34).fork()).ldelim();
    }
    if (message.file2text !== undefined) {
      File2textRequest.encode(message.file2text, writer.uint32(42).fork()).ldelim();
    }
    if (message.text2imagefile !== undefined) {
      Text2imagefileRequest.encode(message.text2imagefile, writer.uint32(50).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TaskRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTaskRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.text2image = Text2imageRequest.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.capitalize = CapitalizeRequest.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.text2text = Text2textRequest.decode(reader, reader.uint32());
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.text2audio = Text2audioRequest.decode(reader, reader.uint32());
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.file2text = File2textRequest.decode(reader, reader.uint32());
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.text2imagefile = Text2imagefileRequest.decode(reader, reader.uint32());
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
      text2image: isSet(object.text2image) ? Text2imageRequest.fromJSON(object.text2image) : undefined,
      capitalize: isSet(object.capitalize) ? CapitalizeRequest.fromJSON(object.capitalize) : undefined,
      text2text: isSet(object.text2text) ? Text2textRequest.fromJSON(object.text2text) : undefined,
      text2audio: isSet(object.text2audio) ? Text2audioRequest.fromJSON(object.text2audio) : undefined,
      file2text: isSet(object.file2text) ? File2textRequest.fromJSON(object.file2text) : undefined,
      text2imagefile: isSet(object.text2imagefile) ? Text2imagefileRequest.fromJSON(object.text2imagefile) : undefined,
    };
  },

  toJSON(message: TaskRequest): unknown {
    const obj: any = {};
    if (message.text2image !== undefined) {
      obj.text2image = Text2imageRequest.toJSON(message.text2image);
    }
    if (message.capitalize !== undefined) {
      obj.capitalize = CapitalizeRequest.toJSON(message.capitalize);
    }
    if (message.text2text !== undefined) {
      obj.text2text = Text2textRequest.toJSON(message.text2text);
    }
    if (message.text2audio !== undefined) {
      obj.text2audio = Text2audioRequest.toJSON(message.text2audio);
    }
    if (message.file2text !== undefined) {
      obj.file2text = File2textRequest.toJSON(message.file2text);
    }
    if (message.text2imagefile !== undefined) {
      obj.text2imagefile = Text2imagefileRequest.toJSON(message.text2imagefile);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<TaskRequest>, I>>(base?: I): TaskRequest {
    return TaskRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<TaskRequest>, I>>(object: I): TaskRequest {
    const message = createBaseTaskRequest();
    message.text2image = (object.text2image !== undefined && object.text2image !== null)
      ? Text2imageRequest.fromPartial(object.text2image)
      : undefined;
    message.capitalize = (object.capitalize !== undefined && object.capitalize !== null)
      ? CapitalizeRequest.fromPartial(object.capitalize)
      : undefined;
    message.text2text = (object.text2text !== undefined && object.text2text !== null)
      ? Text2textRequest.fromPartial(object.text2text)
      : undefined;
    message.text2audio = (object.text2audio !== undefined && object.text2audio !== null)
      ? Text2audioRequest.fromPartial(object.text2audio)
      : undefined;
    message.file2text = (object.file2text !== undefined && object.file2text !== null)
      ? File2textRequest.fromPartial(object.file2text)
      : undefined;
    message.text2imagefile = (object.text2imagefile !== undefined && object.text2imagefile !== null)
      ? Text2imagefileRequest.fromPartial(object.text2imagefile)
      : undefined;
    return message;
  },
};

function createBaseTaskResponse(): TaskResponse {
  return {
    text2image: undefined,
    capitalize: undefined,
    text2text: undefined,
    text2audio: undefined,
    file2text: undefined,
    text2imagefile: undefined,
  };
}

export const TaskResponse = {
  encode(message: TaskResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.text2image !== undefined) {
      Text2imageResponse.encode(message.text2image, writer.uint32(10).fork()).ldelim();
    }
    if (message.capitalize !== undefined) {
      CapitalizeResponse.encode(message.capitalize, writer.uint32(18).fork()).ldelim();
    }
    if (message.text2text !== undefined) {
      Text2textResponse.encode(message.text2text, writer.uint32(26).fork()).ldelim();
    }
    if (message.text2audio !== undefined) {
      Text2audioResponse.encode(message.text2audio, writer.uint32(34).fork()).ldelim();
    }
    if (message.file2text !== undefined) {
      File2textResponse.encode(message.file2text, writer.uint32(42).fork()).ldelim();
    }
    if (message.text2imagefile !== undefined) {
      Text2imagefileResponse.encode(message.text2imagefile, writer.uint32(50).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): TaskResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTaskResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.text2image = Text2imageResponse.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.capitalize = CapitalizeResponse.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.text2text = Text2textResponse.decode(reader, reader.uint32());
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.text2audio = Text2audioResponse.decode(reader, reader.uint32());
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.file2text = File2textResponse.decode(reader, reader.uint32());
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.text2imagefile = Text2imagefileResponse.decode(reader, reader.uint32());
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
      text2image: isSet(object.text2image) ? Text2imageResponse.fromJSON(object.text2image) : undefined,
      capitalize: isSet(object.capitalize) ? CapitalizeResponse.fromJSON(object.capitalize) : undefined,
      text2text: isSet(object.text2text) ? Text2textResponse.fromJSON(object.text2text) : undefined,
      text2audio: isSet(object.text2audio) ? Text2audioResponse.fromJSON(object.text2audio) : undefined,
      file2text: isSet(object.file2text) ? File2textResponse.fromJSON(object.file2text) : undefined,
      text2imagefile: isSet(object.text2imagefile) ? Text2imagefileResponse.fromJSON(object.text2imagefile) : undefined,
    };
  },

  toJSON(message: TaskResponse): unknown {
    const obj: any = {};
    if (message.text2image !== undefined) {
      obj.text2image = Text2imageResponse.toJSON(message.text2image);
    }
    if (message.capitalize !== undefined) {
      obj.capitalize = CapitalizeResponse.toJSON(message.capitalize);
    }
    if (message.text2text !== undefined) {
      obj.text2text = Text2textResponse.toJSON(message.text2text);
    }
    if (message.text2audio !== undefined) {
      obj.text2audio = Text2audioResponse.toJSON(message.text2audio);
    }
    if (message.file2text !== undefined) {
      obj.file2text = File2textResponse.toJSON(message.file2text);
    }
    if (message.text2imagefile !== undefined) {
      obj.text2imagefile = Text2imagefileResponse.toJSON(message.text2imagefile);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<TaskResponse>, I>>(base?: I): TaskResponse {
    return TaskResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<TaskResponse>, I>>(object: I): TaskResponse {
    const message = createBaseTaskResponse();
    message.text2image = (object.text2image !== undefined && object.text2image !== null)
      ? Text2imageResponse.fromPartial(object.text2image)
      : undefined;
    message.capitalize = (object.capitalize !== undefined && object.capitalize !== null)
      ? CapitalizeResponse.fromPartial(object.capitalize)
      : undefined;
    message.text2text = (object.text2text !== undefined && object.text2text !== null)
      ? Text2textResponse.fromPartial(object.text2text)
      : undefined;
    message.text2audio = (object.text2audio !== undefined && object.text2audio !== null)
      ? Text2audioResponse.fromPartial(object.text2audio)
      : undefined;
    message.file2text = (object.file2text !== undefined && object.file2text !== null)
      ? File2textResponse.fromPartial(object.file2text)
      : undefined;
    message.text2imagefile = (object.text2imagefile !== undefined && object.text2imagefile !== null)
      ? Text2imagefileResponse.fromPartial(object.text2imagefile)
      : undefined;
    return message;
  },
};

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
