/**
 * External dependencies
 */
import { Channel, Socket } from "phoenix";

/**
 * TS types
 */
type Callback = () => any;
type ChannelCbMap = { onClose?: Callback; onError?: Callback };
type ChannelHandle = { channel: Channel; jwt: string; retries: number };
type ChannelMap = { [topic: string]: ChannelHandle };
type ChannelParams = { jwt?: string; [key: string]: any };
type ConnectParams = { jwt?: string; [key: string]: any };
type Event = string;
type GetJwtFn = (params: ConnectParams | ChannelParams) => string;
type Payload = object;
type SocketCbMap = {
  onClose?: Callback;
  onError?: Callback;
  onOpen?: Callback;
};
type Topic = string;

const LASAGNA_URL = "https://lasagna.pub/socket";

export default class Lasagna {
  CHANNELS: ChannelMap;
  #lasagnaUrl: string;
  #getJwt: GetJwtFn;
  #socket?: Socket;

  constructor(getJwt: GetJwtFn, lasagnaUrl?: string) {
    this.CHANNELS = {};
    this.#getJwt = getJwt;
    this.#lasagnaUrl = lasagnaUrl || LASAGNA_URL;
  }

  connect(params: ConnectParams, callbacks?: SocketCbMap) {
    const jwt = params.jwt || this.#getJwt(params);

    if (typeof "jwt" !== "string") {
      return false;
    }

    this.#socket = new Socket(this.#lasagnaUrl, { params: { jwt } });

    if (callbacks && callbacks.onOpen) {
      this.#socket.onOpen(callbacks.onOpen);
    }

    if (callbacks && callbacks.onClose) {
      this.#socket.onClose(callbacks.onClose);
    }

    if (callbacks && callbacks.onError) {
      this.#socket.onError(callbacks.onError);
    }

    this.#socket.connect();
  }

  disconnect() {
    this.#socket?.disconnect();
  }

  initChannel(topic: Topic, params: ChannelParams, callbacks?: ChannelCbMap) {
    if (!this.#socket) {
      return false;
    }

    if (!params.jwt) {
      params.jwt = this.#getJwt(params);
    }

    const channel = this.#socket.channel(topic, params);

    if (callbacks && callbacks.onClose) {
      channel.onClose(callbacks.onClose);
    }

    if (callbacks && callbacks.onError) {
      channel.onError(callbacks.onError);
    }

    this.CHANNELS[topic] = {
      channel,
      jwt: params.jwt,
      retries: 0,
    };

    return topic;
  }

  joinChannel(topic: Topic, callback: Callback = () => undefined) {
    this.CHANNELS[topic]?.channel.join().receive("ok", () => callback());
  }

  channelPush(topic: Topic, event: Event, payload: Payload) {
    this.CHANNELS[topic]?.channel.push(event, payload);
  }

  registerEventHandler(topic: Topic, event: Event, callback: Callback) {
    return this.CHANNELS[topic]?.channel.on(event, callback);
  }

  unregisterEventHandler(topic: Topic, event: Event, ref: number) {
    this.CHANNELS[topic]?.channel.off(event, ref);
  }

  leaveChannel(topic: Topic) {
    this.CHANNELS[topic]?.channel.leave();
    delete this.CHANNELS[topic];
  }
}
