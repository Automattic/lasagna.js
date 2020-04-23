/**
 * Mocks
 */
import MockPhoenix, {
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
  const url = "http://unit-test.local";
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
    await lasagna.initChannel("unit-test:thing1");
    await lasagna.initChannel("unit-test:thing3", { jwt: jwtExplicitPassed });
    lasagna.connect();
    lasagna.joinChannel("unit-test:thing3");
    jest.clearAllMocks();
  });

  test("initChannel/2 without jwt param", async () => {
    await lasagna.initChannel("unit-test:thing2", { private: "thingy" });

    expect(lasagna.CHANNELS["unit-test:thing2"].channel).toBeDefined();
    expect(lasagna.CHANNELS["unit-test:thing2"]).toMatchObject({
      params: { jwt: jwtRemoteFetched, private: "thingy" },
      topic: "unit-test:thing2",
      retries: 0,
    });
  });

  test("initChannel/2 with jwt param", async () => {
    await lasagna.initChannel("unit-test:thing2", { jwt: jwtExplicitPassed });

    expect(lasagna.CHANNELS["unit-test:thing2"].channel).toBeDefined();
    expect(lasagna.CHANNELS["unit-test:thing2"]).toMatchObject({
      params: { jwt: jwtExplicitPassed },
      topic: "unit-test:thing2",
      retries: 0,
    });
  });

  test("initChannel/2 with expired jwt param", async () => {
    await lasagna.initChannel("unit-test:thing2", { jwt: jwtExpired });

    expect(lasagna.CHANNELS["unit-test:thing2"].channel).toBeDefined();
    expect(lasagna.CHANNELS["unit-test:thing2"]).toMatchObject({
      params: { jwt: jwtRemoteFetched },
      topic: "unit-test:thing2",
      retries: 0,
    });
  });

  test("initChannel/2 with malformed jwt param", async () => {
    await lasagna.initChannel("unit-test:thing2", { jwt: "blahblah" });

    expect(lasagna.CHANNELS["unit-test:thing2"].channel).toBeDefined();
    expect(lasagna.CHANNELS["unit-test:thing2"]).toMatchObject({
      params: { jwt: jwtRemoteFetched },
      topic: "unit-test:thing2",
      retries: 0,
    });
  });

  test("initChannel/2 with no socket", async () => {
    const burntLasagna = new Lasagna(() => Promise.resolve("whatever"), url);
    expect(await burntLasagna.initChannel("unit-test:thing5")).toBe(false);
  });

  test("joinChannel/2", () => {
    lasagna.joinChannel("unit-test:thing1");
    expect(mockChannelJoin).toHaveBeenCalledTimes(1);
  });

  test("joinChannel/2 with callback", () => {
    const cb = jest.fn().mockImplementation(() => "howdy!");
    lasagna.joinChannel("unit-test:thing1", cb);
    expect(mockChannelJoin).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("joinChannel/2 with (artificially) forced channel refresh", async () => {
    delete lasagna.CHANNELS["unit-test:thing1"].params.jwt;
    await lasagna.joinChannel("unit-test:thing1");

    expect(mockChannelJoin).toHaveBeenCalledTimes(1);
    expect(lasagna.CHANNELS["unit-test:thing1"].channel).toBeDefined();
    expect(lasagna.CHANNELS["unit-test:thing1"]).toMatchObject({
      params: { jwt: jwtRemoteFetched },
      topic: "unit-test:thing1",
      retries: 0,
    });
  });

  test("joinChannel/2 no_auth", async () => {
    await lasagna.initChannel("unit-test:no_auth:hola");
    await lasagna.joinChannel("unit-test:no_auth:hola");

    expect(mockChannelJoin).toHaveBeenCalledTimes(1);
    expect(lasagna.CHANNELS["unit-test:no_auth:hola"].channel).toBeDefined();
    expect(
      lasagna.CHANNELS["unit-test:no_auth:hola"].params.jwt
    ).toBeUndefined();
  });

  test("joinChannel/2 with unexpected ChannelMap corruption", async () => {
    delete lasagna.CHANNELS["unit-test:thing1"];
    expect(await lasagna.joinChannel("unit-test:thing1")).toBe(false);
  });

  test("channelPush/3", () => {
    lasagna.channelPush("unit-test:thing3", "new_sneech", { whatev: "a" });
    expect(mockChannelPush).toHaveBeenCalledTimes(1);
    expect(mockChannelPush).toHaveBeenCalledWith("new_sneech", { whatev: "a" });
  });

  test("registerEventHandler/2", () => {
    const cb = () => "hola!";
    lasagna.registerEventHandler("unit-test:thing3", "starred_sneech", cb);
    expect(mockChannelOn).toHaveBeenCalledTimes(1);
    expect(mockChannelOn).toHaveBeenCalledWith("starred_sneech", cb);
  });

  test("leaveChannel/1", () => {
    lasagna.leaveChannel("unit-test:thing3");
    expect(mockChannelLeave).toHaveBeenCalledTimes(1);
    expect(lasagna.CHANNELS["unit-test:thing3"]).toBeUndefined();
  });

  test("leaveAllChannels/0", () => {
    expect(Object.keys(lasagna.CHANNELS).length > 0);
    lasagna.leaveAllChannels();
    expect(lasagna.CHANNELS).toEqual({});
  });
});
