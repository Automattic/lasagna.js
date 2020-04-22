/**
 * Mocks
 */
import MockPhoenix, {
  mockSocketConnect,
  mockSocketIsConnected,
  mockSocketOnOpen,
  mockSocketOnClose,
  mockSocketOnError,
  mockSocketDisconnect,
} from "./mocks/phoenix";
jest.mock("phoenix", () => MockPhoenix);
import Lasagna from "../lib/lasagna";

/**
 * Test
 */
describe("Socket", () => {
  const url = "http://unit-test.local";
  let lasagna: Lasagna;

  beforeEach(() => {
    lasagna = new Lasagna(() => Promise.resolve("faux-jwt-resp"), url);
    jest.clearAllMocks();
  });

  test("initSocket/1 without jwt param", async () => {
    await lasagna.initSocket({ user_id: "dmte", email: "bob@example.com" });
    lasagna.connect();
    expect(MockPhoenix.Socket).toHaveBeenCalledWith(url, {
      params: { jwt: "faux-jwt-resp" },
    });
    expect(mockSocketConnect).toHaveBeenCalledTimes(1);
  });

  test("initSocket/1 with jwt param", async () => {
    const params = { jwt: "test" };
    await lasagna.initSocket(params);
    lasagna.connect();
    expect(MockPhoenix.Socket).toHaveBeenCalledWith(url, { params });
    expect(mockSocketConnect).toHaveBeenCalledTimes(1);
  });

  test("initSocket/1 with bad jwt param", async () => {
    // @ts-ignore: type mismatch
    expect(await lasagna.initSocket({ jwt: [] })).toBe(false);
    lasagna.connect();
    expect(MockPhoenix.Socket).toHaveBeenCalledTimes(0);
  });

  test("initSocket/1 with jwt param and callbacks", async () => {
    const params = { jwt: "test" };
    const callbacks = {
      onOpen: () => "yay!",
      onClose: () => "aww",
      onError: () => "doh",
    };
    await lasagna.initSocket(params, callbacks);
    lasagna.connect();
    expect(MockPhoenix.Socket).toHaveBeenCalledWith(url, { params });
    expect(mockSocketOnOpen).toHaveBeenCalledTimes(1);
    expect(mockSocketOnOpen).toHaveBeenCalledWith(callbacks.onOpen);
    expect(mockSocketOnClose).toHaveBeenCalledTimes(1);
    expect(mockSocketOnClose).toHaveBeenCalledWith(callbacks.onClose);
    expect(mockSocketOnError).toHaveBeenCalledTimes(1);
    expect(mockSocketOnError).toHaveBeenCalledWith(expect.any(Function));
    expect(mockSocketConnect).toHaveBeenCalledTimes(1);
  });

  test("isConnected/0", async () => {
    await lasagna.initSocket({ jwt: "test" });
    lasagna.isConnected();
    expect(mockSocketIsConnected).toHaveBeenCalledTimes(1);
  });

  test("disconnect/0", async () => {
    await lasagna.initSocket({ jwt: "test" });
    lasagna.connect();
    lasagna.disconnect();
    expect(mockSocketDisconnect).toHaveBeenCalledTimes(1);
  });
});
