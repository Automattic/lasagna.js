export const mockConnect = jest.fn();
export const mockDisconnect = jest.fn();
export const mockChannelOn = jest.fn();
export const mockChannelPush = jest.fn();
export const mockChannelLeave = jest.fn();
export const mockChannelJoin = jest.fn().mockImplementation(() => {
  return new mockPush();
});

const mockPush = jest.fn().mockImplementation(() => ({
  receive: (_event: string, callback: () => any) => callback(),
}));

const mockChannel = jest.fn().mockImplementation(() => ({
  join: mockChannelJoin,
  leave: mockChannelLeave,
  on: mockChannelOn,
  push: mockChannelPush,
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
