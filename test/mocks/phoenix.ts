export const mockSocketConnect = jest.fn();
export const mockSocketDisconnect = jest.fn();
export const mockSocketIsConnected = jest.fn().mockImplementation(() => false);
export const mockSocketOnOpen = jest.fn();
export const mockSocketOnClose = jest.fn();
export const mockSocketOnError = jest.fn();
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
  connect: mockSocketConnect,
  channel: mockChannel,
  onOpen: mockSocketOnOpen,
  onClose: mockSocketOnClose,
  onError: mockSocketOnError,
  isConnected: mockSocketIsConnected,
  disconnect: mockSocketDisconnect,
}));

export default {
  Socket: mockSocket,
  Channel: mockChannel,
  Push: mockPush,
};
