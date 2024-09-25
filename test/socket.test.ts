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
  const jwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTg3NTY2MTM4LCJleHAiOjIyMTg1NTAzNjg4OH0.A1fxARHsTBcjJez9MEDrqm8xC3ypasfAGBTl1A64sD0";
  const anotherJwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTg3NTY2MTM4LCJleHAiOjE5MDI5ODEyNjA1OH0.prqRY4pl4Q0C3R73ZKCAx5KwAEYc-DMDsKDvLHV-sx4";
  let lasagna: Lasagna;

  beforeEach(() => {
    lasagna = new Lasagna(() => Promise.resolve(jwt), url);
    jest.clearAllMocks();
  });

  test("initSocket/1 without jwt param", async () => {
    await lasagna.initSocket({ user_id: "dmte", email: "bob@example.com" });
    lasagna.connect();
    expect(MockPhoenix.Socket.mock.calls[0][0]).toBe(url);
    expect(MockPhoenix.Socket.mock.calls[0][1].params()).toMatchObject({ jwt });
    expect(mockSocketConnect).toHaveBeenCalledTimes(1);
  });

  test("initSocket/1 with jwt param", async () => {
    const params = { jwt: anotherJwt };
    await lasagna.initSocket(params);
    lasagna.connect();
    expect(MockPhoenix.Socket.mock.calls[0][0]).toBe(url);
    expect(MockPhoenix.Socket.mock.calls[0][1].params()).toMatchObject({ jwt: anotherJwt });
    expect(mockSocketConnect).toHaveBeenCalledTimes(1);
  });

  test("initSocket/1 with bad fetcher response", async () => {
    const burntLasagna = new Lasagna(() => Promise.resolve(""), url);
    expect(await burntLasagna.initSocket()).toBe(false);
  });

  test("initSocket/1 with bad jwt param and bad fetcher response", async () => {
    const burntLasagna = new Lasagna(() => Promise.resolve(""), url);
    // @ts-ignore: type mismatch
    expect(await burntLasagna.initSocket({ jwt: [] })).toBe(false);
    burntLasagna.connect();
    expect(MockPhoenix.Socket).toHaveBeenCalledTimes(0);
  });

  test("initSocket/1 with jwt param and callbacks", async () => {
    const params = { jwt: anotherJwt };
    const callbacks = {
      onOpen: () => "yay!",
      onClose: () => "aww",
      onError: () => "doh",
    };
    await lasagna.initSocket(params, callbacks);
    lasagna.connect();
    expect(MockPhoenix.Socket.mock.calls[0][0]).toBe(url);
    expect(MockPhoenix.Socket.mock.calls[0][1].params()).toMatchObject({ jwt: anotherJwt });
    expect(mockSocketOnOpen).toHaveBeenCalledTimes(1);
    expect(mockSocketOnOpen).toHaveBeenCalledWith(callbacks.onOpen);
    expect(mockSocketOnClose).toHaveBeenCalledTimes(1);
    expect(mockSocketOnClose).toHaveBeenCalledWith(callbacks.onClose);
    expect(mockSocketOnError).toHaveBeenCalledTimes(1);
    expect(mockSocketOnError).toHaveBeenCalledWith(expect.any(Function));
    expect(mockSocketConnect).toHaveBeenCalledTimes(1);
  });

  test("isConnected/0", async () => {
    await lasagna.initSocket({ jwt: anotherJwt });
    expect(lasagna.isConnected()).toBe(false);
    expect(mockSocketIsConnected).toHaveBeenCalledTimes(1);
  });

  test("disconnect/0", async () => {
    await lasagna.initSocket({ jwt: anotherJwt });
    lasagna.connect();
    lasagna.disconnect();
    expect(mockSocketDisconnect).toHaveBeenCalledTimes(1);
  });
});
