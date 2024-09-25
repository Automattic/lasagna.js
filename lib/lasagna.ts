/**
 * External dependencies
 */
import { Channel, Socket, Presence } from "phoenix";
import { EventEmitter } from "events";
import JWT from "jwt-decode";

/**
 * TS types
 */
type Callback = (...args: any[]) => void;
type ChannelCbs = {
  onClose?: Callback;
  onError?: Callback;
  onJoin?: Callback;
};
type ChannelHandle = {
  callbacks: ChannelCbs;
  channel: Channel;
  eventBindings: EventBindingsMap;
  params: Params;
  presence?: Presence;
  presenceCallbacks?: PresenceCbs;
  topic: Topic;
};
type ChannelMap = { [topic: string]: ChannelHandle };
type DecodedJWT = { cxp?: number; exp: number; iat: number; iss: string };
type Event = string;
type EventBindingsMap = {
  [event: string]: Callback[];
};
type GetJwtFn = (
  type: "socket" | "channel",
  meta: GetJwtFnMetaParam
) => Promise<string>;
type GetJwtFnMetaParam = { params: Params; topic?: Topic };
type Params = { jwt?: string; [key: string]: any };
type Payload = object;
type PresenceCbs = {
  onJoin?: Callback;
  onLeave?: Callback;
  onSync?: Callback;
};
type SocketCbs = {
  onClose?: Callback;
  onError?: Callback;
  onOpen?: Callback;
};
type Topic = string;

/**
 * Module variables
 */
// tslint:disable:no-var-requires
const { version } = require("../package.json");
const LASAGNA_JS_UA = "lasagna.js/" + version;
const LASAGNA_URL = "wss://rt-api.wordpress.com/socket";
const NO_AUTH = "no_auth";
const NOOP = () => undefined;

/**
 * Lasagna.js
 */
export default class Lasagna {
  CHANNELS: ChannelMap;
  #eventEmitter: EventEmitter;
  #lasagnaUrl: string;
  #getJwt: GetJwtFn;
  #socket?: Socket;

  constructor(getJwt: GetJwtFn, lasagnaUrl?: string) {
    this.CHANNELS = {};
    this.#eventEmitter = new EventEmitter();
    this.#getJwt = getJwt;
    this.#lasagnaUrl = lasagnaUrl || LASAGNA_URL;
  }

  /**
   * Socket
   */

  async initSocket(params: Params = {}, callbacks?: SocketCbs) {
    const { jwt: initialJwt, ...jwtParams } = params;
    let jwt = initialJwt;
    let jwtRequest: Promise<string> | null = null;

    if (this.isInvalidJwt(jwt)) {
      jwt = await this.#safeGetJwt("socket", { params: jwtParams });

      if (this.isInvalidJwt(jwt)) {
        this.disconnect();
        return false;
      }
    }

    this.#socket = new Socket(this.#lasagnaUrl, {
      params: () => ({ jwt, user_agent: LASAGNA_JS_UA }),
    });

    if (callbacks && callbacks.onOpen) {
      this.#socket.onOpen(callbacks.onOpen);
    }

    if (callbacks && callbacks.onClose) {
      this.#socket.onClose(callbacks.onClose);
    }

    this.#socket.onError(async () => {
      if (callbacks && callbacks.onError) {
        callbacks.onError();
      }

      if (this.isInvalidJwt(jwt)) {
        // Refresh the token so that Phoenix `reconnectTimer` can pick it up on next try
        if (!jwtRequest) {
          jwtRequest = this.#safeGetJwt("socket", { params: jwtParams });
        }
        jwt = await jwtRequest;
        jwtRequest = null;
        if (this.isInvalidJwt(jwt)) {
          this.disconnect();
        }
      }
    });
  }

  connect = () => this.#socket?.connect();

  isConnected() {
    return this.#socket?.isConnected();
  }

  disconnect = (callback?: Callback) => {
    this.leaveAllChannels();
    this.#socket?.disconnect(callback);
    this.#socket = undefined;
  };

  /**
   * Channel
   */

  async initChannel(
    topic: Topic,
    params: Params = {},
    callbacks: ChannelCbs = {},
    eventBindings: EventBindingsMap = {}
  ) {
    this.leaveChannel(topic);

    if (typeof topic !== "string" || topic === "" || !this.#socket) {
      return false;
    }

    if (this.shouldAuth(topic)) {
      if (!params.jwt || this.isInvalidJwt(params.jwt)) {
        params.jwt = await this.#safeGetJwt("channel", { params, topic });
      }

      if (this.isInvalidJwt(params.jwt)) {
        return false;
      }
    }

    const channel = this.#socket.channel(topic, { jwt: params.jwt });

    if (callbacks.onError) {
      channel.onError(callbacks.onError);
    }

    if (callbacks.onClose) {
      channel.onClose(callbacks.onClose);
    }

    eventBindings.banned = [() => this.leaveChannel(topic)];
    eventBindings.kicked = [() => this.#emitChannelRejoin(topic)];

    this.CHANNELS[topic] = {
      callbacks,
      channel,
      eventBindings,
      params,
      topic,
    };

    this.#bulkBindEvents(topic, eventBindings);
    this.#addChannelRejoinListener(topic);
  }

  initPresence(topic: Topic, callbacks: PresenceCbs = {}) {
    if (!this.#socket || !this.CHANNELS[topic]?.channel) {
      return false;
    }

    const presence = new Presence(this.CHANNELS[topic].channel);

    if (callbacks.onSync) {
      const syncCb = callbacks.onSync;
      presence.onSync(() => syncCb(presence));
    }

    if (callbacks.onJoin) {
      presence.onJoin(callbacks.onJoin);
    }

    if (callbacks.onLeave) {
      presence.onLeave(callbacks.onLeave);
    }

    this.#socket.onMessage(
      ({ topic: msgTopic, event, payload, ref, join_ref }) => {
        if (this.#shouldApplyPresenceDiff(event, msgTopic, topic)) {
          // @ts-ignore private (untyped) Channel API, used intentionally
          this.CHANNELS[topic].channel.trigger(event, payload, ref, join_ref);
        }
      }
    );

    this.CHANNELS[topic].presence = presence;
  }

  joinChannel(topic: Topic, callback: Callback = NOOP) {
    if (typeof topic !== "string" || topic === "") {
      return false;
    }

    if (!this.CHANNELS[topic]) {
      return false;
    }

    this.CHANNELS[topic].callbacks = {
      ...this.CHANNELS[topic].callbacks,
      onJoin: callback,
    };

    this.CHANNELS[topic].channel
      .join()
      .receive("ok", () => callback())
      .receive("error", () => {
        if (!this.shouldAuth(topic)) {
          return;
        }

        if (!this.isInvalidJwt(this.CHANNELS[topic].params.jwt)) {
          return;
        }

        this.#eventEmitter.emit(
          "lasagna-rejoin-" + topic,
          this.CHANNELS[topic]
        );
      });
  }

  channelPush(topic: Topic, event: Event, payload: Payload) {
    this.CHANNELS[topic]?.channel.push(event, payload);
  }

  isInvalidJwt(jwt: any) {
    if (typeof jwt !== "string" || jwt === "") {
      return true;
    }

    const { cxp, exp } = this.#getJwtExps(jwt);

    return (cxp && Date.now() >= cxp) || Date.now() >= exp;
  }

  shouldAuth(topic: Topic) {
    return topic.split(":")[0].split("-")[1] !== NO_AUTH;
  }

  registerEventHandler(topic: Topic, event: Event, callback: Callback) {
    if (!this.CHANNELS[topic]) {
      return false;
    }

    const existingBindings = this.CHANNELS[topic].eventBindings[event] || [];

    this.CHANNELS[topic].eventBindings = {
      ...this.CHANNELS[topic].eventBindings,
      [event]: [...existingBindings, callback],
    };

    return this.CHANNELS[topic].channel.on(event, callback);
  }

  unregisterAllEventHandlers(topic: Topic, event: Event) {
    if (!this.CHANNELS[topic]) {
      return false;
    }

    this.CHANNELS[topic].channel.off(event);
    delete this.CHANNELS[topic].eventBindings[event];
  }

  leaveChannel(topic: Topic) {
    this.#eventEmitter.removeAllListeners("lasagna-rejoin-" + topic);
    this.CHANNELS[topic]?.channel.leave();
    delete this.CHANNELS[topic];
  }

  leaveAllChannels() {
    Object.keys(this.CHANNELS).forEach((topic) => this.leaveChannel(topic));
    this.CHANNELS = {};
  }

  /**
   * Private methods
   */

  #addChannelRejoinListener = (topic: Topic) => {
    this.#eventEmitter.once("lasagna-rejoin-" + topic, this.#rejoinChannel);
  };

  #bulkBindEvents = (topic: Topic, eventBindings: EventBindingsMap) => {
    if (!this.CHANNELS[topic] || !this.CHANNELS[topic].channel) {
      return false;
    }

    Object.entries(eventBindings).forEach(([event, callbacks]) => {
      this.CHANNELS[topic].channel.off(event);

      callbacks.forEach((callback) =>
        this.CHANNELS[topic].channel.on(event, callback)
      );
    });
  };

  #emitChannelRejoin = (topic: Topic) => {
    this.#eventEmitter.emit("lasagna-rejoin-" + topic, this.CHANNELS[topic]);
  };

  #getJwtExps = (jwt: string) => {
    let cxp;
    let exp;

    try {
      const decodedJwt: DecodedJWT = JWT(jwt);
      if (decodedJwt.cxp) {
        cxp = decodedJwt.cxp * 1000;
      }
      exp = decodedJwt.exp * 1000;
    } catch {
      cxp = 0;
      exp = 0;
    }

    return { cxp, exp };
  };

  #safeGetJwt: GetJwtFn = async (jwtType, meta) => {
    let jwt;

    try {
      jwt = await this.#getJwt(jwtType, meta);
    } catch {
      jwt = "";
    }

    return jwt;
  };

  #shouldApplyPresenceDiff = (event: Event, msgTopic: Topic, topic: Topic) => {
    return (
      event === "presence_diff" &&
      (msgTopic === "presence:private:" + topic ||
        msgTopic === "presence:public:" + topic)
    );
  };

  #rejoinChannel = async ({
    topic,
    params,
    callbacks,
    eventBindings,
  }: ChannelHandle) => {
    const onJoinCb = this.CHANNELS[topic].callbacks?.onJoin;
    const presenceCbs = this.CHANNELS[topic].presenceCallbacks;

    this.leaveChannel(topic);
    await this.initChannel(topic, params, callbacks, eventBindings);

    if (presenceCbs) {
      this.initPresence(topic, presenceCbs);
    }

    this.joinChannel(topic, onJoinCb);
  };
}

module.exports = Lasagna;
