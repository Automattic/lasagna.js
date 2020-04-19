import MockPhoenix, { mockConnect, mockDisconnect } from "./mocks/phoenix";
jest.mock("phoenix", () => MockPhoenix);
import Lasagna from "../lib/lasagna";

const url = "http://unit-test.local";
let lasagna: Lasagna;

describe("Socket", () => {
  beforeEach(() => {
    lasagna = new Lasagna(() => "unit-test", url);
  });

  test("constructor/2", () => {
    expect(lasagna.lasagnaUrl).toBe(url);
  });

  test("connect/1", () => {});

  test("connect/1 with jwt param", () => {
    const params = { jwt: "test" };
    lasagna.connect(params);
    expect(MockPhoenix.Socket).toHaveBeenCalledWith(url, { params });
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  test("disconnect/0", () => {
    lasagna.connect({ jwt: "test" });
    lasagna.disconnect();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
