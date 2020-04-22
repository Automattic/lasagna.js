/**
 * External dependencies
 */
import { Channel, Socket } from "phoenix";
import JWT from "jwt-decode";

/**
 * TS types
 */
type Callback = () => any;
type ChannelCbs = { onClose?: Callback; onError?: Callback };
type ChannelHandle = {
  callbacks: ChannelCbs | undefined;
  channel: Channel;
  params: Params;
  retries: number;
  topic: Topic;
};
type ChannelMap = { [topic: string]: ChannelHandle };
type DecodedJWT = { exp: number; iat: number; iss: string };
type Event = string;
type GetJwtFn = (
  type: "socket" | "channel",
  meta: GetJwtFnMetaParam
) => Promise<string>;
type GetJwtFnMetaParam = { params: Params; topic?: Topic };
type Params = { jwt?: string; [key: string]: any };
type Payload = object;
type SocketCbs = {
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

  async initSocket(params: Params = {}, callbacks?: SocketCbs) {
    const jwt = params.jwt || (await this.#getJwt("socket", { params }));

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

    this.#socket.onError(() => {
      if (callbacks && callbacks.onError) {
        callbacks.onError();
      }

      if (this.#shouldRefreshJwt(jwt)) {
        this.#reconnectSocket(params, callbacks);
      }
    });
  }

  connect() {
    this.#socket?.connect();
  }

  disconnect() {
    this.#socket?.disconnect();
    this.#socket = undefined;
  }

  /**
   * Channel
   */

  async initChannel(topic: Topic, params: Params = {}, callbacks?: ChannelCbs) {
    if (!this.#socket) {
      return false;
    }

    if (!params.jwt || this.#shouldRefreshJwt(params.jwt)) {
      params.jwt = await this.#getJwt("channel", { params, topic });
    }

    if (typeof params.jwt !== "string" || params.jwt === "") {
      return false;
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
      retries: 0,
    };
  }

  joinChannel(topic: Topic, callback: Callback = () => undefined) {
    if (!this.CHANNELS[topic]) {
      return false;
    }

    const jwt = this.CHANNELS[topic].params.jwt;

    if (!jwt || this.#shouldRefreshJwt(jwt)) {
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

  #shouldRefreshJwt = (jwt: string) => Date.now() >= this.#getJwtExp(jwt);

  #reconnectSocket = async (params: Params, callbacks?: SocketCbs) => {
    this.disconnect();
    delete params.jwt;
    await this.initSocket(params, callbacks);
    this.connect();
  };

  #refreshChannel = async ({ topic, params, callbacks }: ChannelHandle) => {
    this.leaveChannel(topic);
    delete params.jwt;
    await this.initChannel(topic, params, callbacks);
  };
}
