/**
 * Mocks
 */
import MockPhoenix, {
  setEventOnWire,
  mockChannelJoin,
  mockChannelLeave,
  mockChannelOn,
  mockChannelPush,
} from "./mocks/phoenix";
jest.mock("phoenix", () => MockPhoenix);
import Lasagna from "../lib/lasagna";

/**
 * Test
 */
describe("Channel", () => {
  const url = "http://test.local";
  const jwtExpired =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0Ijo5MjQ3OTA2NTgsImV4cCI6OTI0NzkxNjU4fQ.iwZ26LyWfUjWK09Z0Z7bbkw6y8J2_hODsIgUU-HYh3k";
  const jwtExplicitPassed =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTg3NTY2MTM4LCJleHAiOjIyMTg1NTAzNjg4OH0.A1fxARHsTBcjJez9MEDrqm8xC3ypasfAGBTl1A64sD0";
  const jwtRemoteFetched =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTg3NTY2MTM4LCJleHAiOjE5MDI5ODEyNjA1OH0.prqRY4pl4Q0C3R73ZKCAx5KwAEYc-DMDsKDvLHV-sx4";
  let lasagna: Lasagna;

  beforeEach(async () => {
    lasagna = new Lasagna(() => Promise.resolve(jwtRemoteFetched), url);
    await lasagna.initSocket({ remote: "stuff" });
    await lasagna.initChannel("test:thing1");
    await lasagna.initChannel("test:thing3", { jwt: jwtExplicitPassed });
    lasagna.connect();
    lasagna.joinChannel("test:thing3");
    jest.clearAllMocks();
  });

  test("initChannel/2 without jwt param", async () => {
    await lasagna.initChannel("test:thing2", { private: "thingy" });

    expect(lasagna.CHANNELS["test:thing2"].channel).toBeDefined();
    expect(lasagna.CHANNELS["test:thing2"]).toMatchObject({
      params: { jwt: jwtRemoteFetched, private: "thingy" },
      topic: "test:thing2",
    });
  });

  test("initChannel/2 with jwt param", async () => {
    await lasagna.initChannel("test:thing2", { jwt: jwtExplicitPassed });

    expect(lasagna.CHANNELS["test:thing2"].channel).toBeDefined();
    expect(lasagna.CHANNELS["test:thing2"]).toMatchObject({
      params: { jwt: jwtExplicitPassed },
      topic: "test:thing2",
    });
  });

  test("initChannel/2 with expired jwt param", async () => {
    await lasagna.initChannel("test:thing2", { jwt: jwtExpired });

    expect(lasagna.CHANNELS["test:thing2"].channel).toBeDefined();
    expect(lasagna.CHANNELS["test:thing2"]).toMatchObject({
      params: { jwt: jwtRemoteFetched },
      topic: "test:thing2",
    });
  });

  test("initChannel/2 with malformed jwt param", async () => {
    await lasagna.initChannel("test:thing2", { jwt: "blahblah" });

    expect(lasagna.CHANNELS["test:thing2"].channel).toBeDefined();
    expect(lasagna.CHANNELS["test:thing2"]).toMatchObject({
      params: { jwt: jwtRemoteFetched },
      topic: "test:thing2",
    });
  });

  test("initChannel/2 with no socket", async () => {
    const burntLasagna = new Lasagna(() => Promise.resolve("whatever"), url);
    expect(await burntLasagna.initChannel("test:thing5")).toBe(false);
  });

  test("initChannel/2 with non-string JWT fetch response", async () => {
    // @ts-ignore we want this type mismatch for the test scenario
    const lasagna2 = new Lasagna(() => Promise.resolve({ notajwt: 1 }), url);
    await lasagna2.initSocket({ jwt: jwtExplicitPassed });
    await lasagna2.initChannel("test:thing7");
    lasagna2.connect();
    expect(await lasagna2.joinChannel("test:thing7")).toBe(false);
  });

  test("joinChannel/2", () => {
    lasagna.joinChannel("test:thing1");
    expect(mockChannelJoin).toHaveBeenCalledTimes(1);
  });

  test("joinChannel/2 with callback", () => {
    const cb = jest.fn().mockImplementation(() => "howdy!");
    setEventOnWire("ok");
    lasagna.joinChannel("test:thing1", cb);
    expect(mockChannelJoin).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("joinChannel/2 with error then channel refresh", async () => {
    delete lasagna.CHANNELS["test:thing1"].params.jwt;
    setEventOnWire("error");
    lasagna.joinChannel("test:thing1");

    // ugly, but we have to wait for the reinit via emit to happen
    await new Promise((r) => setTimeout(r, 1000));

    expect(mockChannelJoin).toHaveBeenCalledTimes(2);
    expect(lasagna.CHANNELS["test:thing1"].channel).toBeDefined();
    expect(lasagna.CHANNELS["test:thing1"]).toMatchObject({
      params: { jwt: jwtRemoteFetched },
      topic: "test:thing1",
    });
  });

  test("joinChannel/2 no_auth", async () => {
    await lasagna.initChannel("test-no_auth:hola");
    lasagna.joinChannel("test-no_auth:hola");

    expect(mockChannelJoin).toHaveBeenCalledTimes(1);
    expect(lasagna.CHANNELS["test-no_auth:hola"].channel).toBeDefined();
    expect(lasagna.CHANNELS["test-no_auth:hola"].params.jwt).toBeUndefined();
  });

  test("joinChannel/2 with unexpected ChannelMap corruption", async () => {
    delete lasagna.CHANNELS["test:thing1"];
    expect(lasagna.joinChannel("test:thing1")).toBe(false);
  });

  test("channelPush/3", () => {
    lasagna.channelPush("test:thing3", "new_sneech", { whatev: "a" });
    expect(mockChannelPush).toHaveBeenCalledTimes(1);
    expect(mockChannelPush).toHaveBeenCalledWith("new_sneech", { whatev: "a" });
  });

  test("registerEventHandler/2", () => {
    const cb = () => "hola!";
    lasagna.registerEventHandler("test:thing3", "starred_sneech", cb);
    expect(mockChannelOn).toHaveBeenCalledTimes(1);
    expect(mockChannelOn).toHaveBeenCalledWith("starred_sneech", cb);
  });

  test("leaveChannel/1", () => {
    lasagna.leaveChannel("test:thing3");
    expect(mockChannelLeave).toHaveBeenCalledTimes(1);
    expect(lasagna.CHANNELS["test:thing3"]).toBeUndefined();
  });

  test("leaveAllChannels/0", () => {
    expect(Object.keys(lasagna.CHANNELS).length > 0);
    lasagna.leaveAllChannels();
    expect(lasagna.CHANNELS).toEqual({});
  });

  test("shouldAuth/1 true", () => {
    expect(lasagna.shouldAuth("push:some:such")).toBe(true);
    expect(lasagna.shouldAuth("push-presence:some:such")).toBe(true);
    expect(lasagna.shouldAuth("bus:some:such")).toBe(true);
    expect(lasagna.shouldAuth("weird:default:safe")).toBe(true);
  });

  test("shouldAuth/1 false", () => {
    expect(lasagna.shouldAuth("push-no_auth:some:such")).toBe(false);
    expect(lasagna.shouldAuth("push-no_auth-presence:some:such")).toBe(false);
    expect(lasagna.shouldAuth("bus-no_auth:some:such")).toBe(false);
  });
});
