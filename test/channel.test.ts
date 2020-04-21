import MockPhoenix, {
  mockChannelJoin,
  mockChannelLeave,
  mockChannelOn,
  mockChannelPush,
} from "./mocks/phoenix";
jest.mock("phoenix", () => MockPhoenix);
import Lasagna from "../lib/lasagna";

const url = "http://unit-test.local";
const testJwt =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyNDkwMjJ9.yhajB9YVkJKfPgly4pm2Kizmto0xXdC50-URV3g9eno";
let lasagna: Lasagna;

describe("Channel", () => {
  beforeEach(async () => {
    lasagna = new Lasagna(() => Promise.resolve(testJwt), url);
    await lasagna.connect({ remote: "stuff" });
    await lasagna.initChannel("unit-test:thing1", { jwt: "yadayada" });
    await lasagna.initChannel("unit-test:thing3", { jwt: "lololol" });
    lasagna.joinChannel("unit-test:thing3");
    jest.clearAllMocks();
  });

  test("initChannel/2 without jwt param", async () => {
    await lasagna.initChannel("unit-test:thing2", { private: "thingy" });

    expect(lasagna.CHANNELS["unit-test:thing2"].channel).toBeDefined();
    expect(lasagna.CHANNELS["unit-test:thing2"]).toMatchObject({
      params: { jwt: testJwt, private: "thingy" },
      topic: "unit-test:thing2",
      jwt_exp: 1516249022000,
      retries: 0,
    });
  });

  test("initChannel/2 with jwt param", async () => {
    lasagna.initChannel("unit-test:thing2", { jwt: "blahblah" });

    expect(lasagna.CHANNELS["unit-test:thing2"].channel).toBeDefined();
    expect(lasagna.CHANNELS["unit-test:thing2"]).toMatchObject({
      params: { jwt: "blahblah" },
      topic: "unit-test:thing2",
      jwt_exp: 0, // expected! because bad JWT
      retries: 0,
    });
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

  test("leaveChannel/0", () => {
    lasagna.leaveChannel("unit-test:thing3");
    expect(mockChannelLeave).toHaveBeenCalledTimes(1);
    expect(lasagna.CHANNELS["unit-test:thing3"]).toBeUndefined();
  });
});
