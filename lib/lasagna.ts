/**
 * External dependencies
 */
import { Channel, Socket } from "phoenix";
import JWT from "jwt-decode";

/**
 * TS types
 */
type Callback = () => any;
type ChannelCbs = { onClose?: Callback; onError?: Callback; onJoin?: Callback };
type ChannelHandle = {
  callbacks: ChannelCbs | undefined;
  channel: Channel;
  params: Params;
  topic: Topic;
};
type ChannelMap = { [topic: string]: ChannelHandle };
type DecodedChannelJWT = { cxp: number; exp: number; iat: number; iss: string };
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

const EventEmitter = require("events");
const eventEmitter = new EventEmitter();

const LASAGNA_URL = "wss://rt-api.wordpress.com/socket";
const NO_AUTH = "no_auth";

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

    if (this.#isInvalidJwt(jwt)) {
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

      if (this.#isInvalidJwt(jwt)) {
        this.#reconnectSocket(params, callbacks);
      }
    });
  }

  connect() {
    this.#socket?.connect();
  }

  isConnected() {
    return this.#socket?.isConnected();
  }

  disconnect(callback?: Callback) {
    this.leaveAllChannels();
    this.#socket?.disconnect(callback);
    this.#socket = undefined;
  }

  /**
   * Channel
   */

  async initChannel(topic: Topic, params: Params = {}, callbacks?: ChannelCbs) {
    if (typeof topic !== "string" || topic === "" || !this.#socket) {
      return false;
    }

    if (this.shouldAuth(topic)) {
      if (!params.jwt || this.#isInvalidJwt(params.jwt)) {
        params.jwt = await this.#getJwt("channel", { params, topic });
      }

      if (this.#isInvalidJwt(params.jwt)) {
        return false;
      }
    }

    const channel = this.#socket.channel(topic, params);

    if (callbacks && callbacks.onError) {
      channel.onError(callbacks.onError);
    }

    channel.onClose(() => {
      if (callbacks && callbacks.onClose) {
        callbacks.onClose();
      }

      if (this.#shouldRejoinOnClose(topic)) {
        eventEmitter.emit("lasagna-rejoin-" + topic, this.CHANNELS[topic]);
      }
    });

    eventEmitter.addListener("lasagna-rejoin-" + topic, this.#rejoinChannel);

    this.CHANNELS[topic] = {
      callbacks,
      channel,
      params,
      topic,
    };
  }

  joinChannel(topic: Topic, callback: Callback = () => undefined) {
    if (typeof topic !== "string" || topic === "" || !this.CHANNELS[topic]) {
      return false;
    }

    this.CHANNELS[topic].callbacks = {
      ...this.CHANNELS[topic].callbacks,
      onJoin: callback,
    };

    this.CHANNELS[topic].channel
      .join()
      .receive("ok", () => callback())
      .receive("error", async () => {
        if (!this.shouldAuth(topic)) {
          return;
        }

        if (this.#isInvalidJwt(this.CHANNELS[topic].params.jwt)) {
          this.CHANNELS[topic].params.jwt = await this.#getJwt("channel", {
            params: this.CHANNELS[topic].params,
            topic,
          });
        }

        if (this.#isInvalidJwt(this.CHANNELS[topic].params.jwt)) {
          this.leaveChannel(topic);
        }
      });
  }

  channelPush(topic: Topic, event: Event, payload: Payload) {
    this.CHANNELS[topic]?.channel.push(event, payload);
  }

  shouldAuth = (topic: Topic) => topic.split(":")[0].split("-")[1] !== NO_AUTH;

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

  leaveAllChannels() {
    Object.keys(this.CHANNELS).forEach((key) =>
      this.CHANNELS[key].channel.leave()
    );
    this.CHANNELS = {};
  }

  /**
   * Private methods
   */

  #getJwtExps = (jwt: string) => {
    let cxp;
    let exp;

    try {
      const decodedJwt: DecodedChannelJWT = JWT(jwt);
      cxp = decodedJwt.cxp * 1000;
      exp = decodedJwt.exp * 1000;
    } catch {
      cxp = 0;
      exp = 0;
    }

    return { cxp, exp };
  };

  #isInvalidJwt = (jwt: any) => {
    if (typeof jwt !== "string" || jwt === "") {
      return true;
    }

    const { cxp, exp } = this.#getJwtExps(jwt);

    return Date.now() >= cxp || Date.now() >= exp;
  };

  #shouldRejoinOnClose = (topic: Topic) => this.shouldAuth(topic);

  #reconnectSocket = async (params: Params, callbacks?: SocketCbs) => {
    this.disconnect();
    delete params.jwt;
    await this.initSocket(params, callbacks);
    this.connect();
  };

  #rejoinChannel = async ({ topic, params, callbacks }: ChannelHandle) => {
    eventEmitter.removeAllListeners("lasagna-rejoin-" + topic);
    const onJoinCb = this.CHANNELS[topic].callbacks?.onJoin;
    await this.initChannel(topic, params, callbacks);
    this.joinChannel(topic, onJoinCb);
  };
}
