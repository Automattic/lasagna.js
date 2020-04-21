import MockPhoenix, {
  mockSocketConnect,
  mockSocketOnOpen,
  mockSocketOnClose,
  mockSocketOnError,
  mockSocketDisconnect,
} from "./mocks/phoenix";
jest.mock("phoenix", () => MockPhoenix);
import Lasagna from "../lib/lasagna";

const url = "http://unit-test.local";
let lasagna: Lasagna;

describe("Socket", () => {
  beforeEach(() => {
    lasagna = new Lasagna(() => Promise.resolve("faux-jwt-resp"), url);
    jest.clearAllMocks();
  });

  test("connect/1 without jwt param", async () => {
    await lasagna.connect({ user_id: "dmte", email: "bob@example.com" });
    expect(MockPhoenix.Socket).toHaveBeenCalledWith(url, {
      params: { jwt: "faux-jwt-resp" },
    });
    expect(mockSocketConnect).toHaveBeenCalledTimes(1);
  });

  test("connect/1 with jwt param", async () => {
    const params = { jwt: "test" };
    await lasagna.connect(params);
    expect(MockPhoenix.Socket).toHaveBeenCalledWith(url, { params });
    expect(mockSocketConnect).toHaveBeenCalledTimes(1);
  });

  test("connect/1 with bad jwt param", async () => {
    // @ts-ignore: type mismatch
    expect(await lasagna.connect({ jwt: [] })).toBe(false);
    expect(MockPhoenix.Socket).toHaveBeenCalledTimes(0);
  });

  test("connect/1 with jwt param and callbacks", async () => {
    const params = { jwt: "test" };
    const callbacks = {
      onOpen: () => "yay!",
      onClose: () => "aww",
      onError: () => "doh",
    };
    await lasagna.connect(params, callbacks);
    expect(MockPhoenix.Socket).toHaveBeenCalledWith(url, { params });
    expect(mockSocketOnOpen).toHaveBeenCalledTimes(1);
    expect(mockSocketOnOpen).toHaveBeenCalledWith(callbacks.onOpen);
    expect(mockSocketOnClose).toHaveBeenCalledTimes(1);
    expect(mockSocketOnClose).toHaveBeenCalledWith(callbacks.onClose);
    expect(mockSocketOnError).toHaveBeenCalledTimes(1);
    expect(mockSocketOnError).toHaveBeenCalledWith(callbacks.onError);
    expect(mockSocketConnect).toHaveBeenCalledTimes(1);
  });

  test("disconnect/0", async () => {
    await lasagna.connect({ jwt: "test" });
    lasagna.disconnect();
    expect(mockSocketDisconnect).toHaveBeenCalledTimes(1);
  });
});
