/**
 * External dependencies
 */
import { Channel, Socket } from "phoenix";
import JWT from "jwt-decode";

/**
 * TS types
 */
type Callback = () => any;
type ChannelCbMap = { onClose?: Callback; onError?: Callback };
type ChannelHandle = {
  callbacks: ChannelCbMap | undefined;
  channel: Channel;
  jwt_exp: number;
  params: ChannelParams;
  retries: number;
  topic: Topic;
};
type ChannelMap = { [topic: string]: ChannelHandle };
type ChannelParams = { jwt?: string; [key: string]: any };
type ConnectParams = { jwt?: string; [key: string]: any };
type DecodedJWT = { exp: number; iat: number; iss: string };
type Event = string;
type GetJwtFn = (params: ConnectParams | ChannelParams) => string;
type Payload = object;
type SocketCbMap = {
  onClose?: Callback;
  onError?: Callback;
  onOpen?: Callback;
};
type Topic = string;

const LASAGNA_URL = "wss://lasagna.pub/socket";

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

  /**
   * Socket
   */

  connect(params: ConnectParams, callbacks?: SocketCbMap) {
    const jwt = params.jwt || this.#getJwt(params);

    if (typeof jwt !== "string" || jwt === "") {
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

  /**
   * Channel
   */

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
      callbacks,
      channel,
      params,
      topic,
      jwt_exp: this.#getJwtExp(params.jwt),
      retries: 0,
    };

    return topic;
  }

  joinChannel(topic: Topic, callback: Callback = () => undefined) {
    if (!this.CHANNELS[topic]) {
      return false;
    }

    if (this.#shouldRefreshJwt(this.CHANNELS[topic].jwt_exp)) {
      this.#refreshChannel(this.CHANNELS[topic]);
    }

    this.CHANNELS[topic].channel.join().receive("ok", () => callback());
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

  /**
   * Private methods
   */

  #getJwtExp = (jwt: string) => {
    let jwtExp;

    try {
      const decodedJwt: DecodedJWT = JWT(jwt);
      jwtExp = decodedJwt.exp * 1000;
    } catch {
      jwtExp = 0;
    }

    return jwtExp;
  };

  #shouldRefreshJwt = (jwtExp: number) => Date.now() >= jwtExp;

  #refreshChannel = ({ topic, params, callbacks }: ChannelHandle) => {
    delete params.jwt;
    this.initChannel(topic, params, callbacks);
  };
}
