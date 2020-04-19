import MockPhoenix, { mockJoin, mockLeave, mockPushFn } from "./mocks/phoenix";
jest.mock("phoenix", () => MockPhoenix);
import Lasagna from "../lib/lasagna";

const url = "http://unit-test.local";
let lasagna: Lasagna;

describe("Channel", () => {
  beforeEach(() => {
    lasagna = new Lasagna(() => "unit-test", url);
    lasagna.connect({ remote: "stuff" });
    lasagna.initChannel("unit-test:thing1", { jwt: "yadayada" });
    lasagna.initChannel("unit-test:thing3", { jwt: "lololol" });
    lasagna.joinChannel("unit-test:thing3");
    mockJoin.mockClear();
  });

  test("initChannel/2", () => {
    lasagna.initChannel("unit-test:thing2", { jwt: "blahblah" });

    expect(lasagna.CHANNELS["unit-test:thing2"].channel).toBeDefined();
    expect(lasagna.CHANNELS["unit-test:thing2"]).toMatchObject({
      jwt: "blahblah",
      retries: 0,
    });
  });

  test("joinChannel/2", () => {
    lasagna.joinChannel("unit-test:thing1");
    expect(mockJoin).toHaveBeenCalledTimes(1);
  });

  test("joinChannel/2 with callback", () => {
    const cb = jest.fn().mockImplementation(() => "howdy!");
    lasagna.joinChannel("unit-test:thing1", cb);
    expect(mockJoin).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("channelPush/3", () => {
    lasagna.channelPush("unit-test:thing3", "new_sneech", { whatev: "stuff" });
    expect(mockPushFn).toHaveBeenCalledTimes(1);
    expect(mockPushFn).toHaveBeenCalledWith("new_sneech", { whatev: "stuff" });
  });

  test("leaveChannel/0", () => {
    lasagna.leaveChannel("unit-test:thing3");
    expect(mockLeave).toHaveBeenCalledTimes(1);
    expect(lasagna.CHANNELS["unit-test:thing3"]).toBeUndefined();
  });
});
