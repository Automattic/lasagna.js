/**
 * External dependencies
 */
import { Channel, Socket } from "phoenix";

/**
 * TS types
 */
type Callback = () => any;
type ChannelHandle = { channel: Channel; jwt: string; retries: number };
type ChannelMap = { [topic: string]: ChannelHandle };
type ChannelParams = { jwt?: string; [key: string]: any };
type ConnectParams = { jwt?: string; [key: string]: any };
type Event = string;
type GetJwtFn = (params: ConnectParams | ChannelParams) => string;
type Payload = object;
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

  connect(params: ConnectParams) {
    const jwt = params.jwt || this.#getJwt(params);

    if (typeof "jwt" !== "string") {
      return false;
    }

    this.#socket = new Socket(this.#lasagnaUrl, { params: { jwt } });
    this.#socket.connect();
  }

  onSocketOpen(callback: Callback) {
    this.#socket?.onOpen(callback);
  }

  onSocketClose(callback: Callback) {
    this.#socket?.onClose(callback);
  }

  onSocketError(callback: Callback) {
    this.#socket?.onError(callback);
  }

  disconnect() {
    this.#socket?.disconnect();
  }

  initChannel(topic: Topic, params: ChannelParams) {
    if (!this.#socket) {
      return false;
    }

    if (!params.jwt) {
      params.jwt = this.#getJwt(params);
    }

    this.CHANNELS[topic] = {
      channel: this.#socket.channel(topic, params),
      jwt: params.jwt,
      retries: 0,
    };

    return topic;
  }

  joinChannel(topic: Topic, callback: Callback = () => undefined) {
    this.CHANNELS[topic]?.channel.join().receive("ok", () => callback());
  }

  onChannelClose(topic: Topic, callback: Callback) {
    this.CHANNELS[topic]?.channel.onClose(callback);
  }

  onChannelError(topic: Topic, callback: Callback) {
    this.CHANNELS[topic]?.channel.onError(callback);
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
