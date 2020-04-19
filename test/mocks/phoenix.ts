export const mockConnect = jest.fn();
export const mockDisconnect = jest.fn();
export const mockJoin = jest.fn().mockImplementation(() => new mockPush());
export const mockPushFn = jest.fn();
export const mockLeave = jest.fn();

const mockPush = jest.fn().mockImplementation(() => ({
  receive: (_event: string, callback: () => any) => callback(),
}));

const mockChannel = jest.fn().mockImplementation(() => ({
  join: mockJoin,
  leave: mockLeave,
  push: mockPushFn,
}));

const mockSocket = jest.fn().mockImplementation(() => ({
  connect: mockConnect,
  channel: mockChannel,
  disconnect: mockDisconnect,
}));

export default {
  Socket: mockSocket,
  Channel: mockChannel,
  Push: mockPush,
};
