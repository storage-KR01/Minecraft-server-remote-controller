import { io, Socket } from 'socket.io-client';

type RconResult = {
  ok: boolean;
  serverId?: string;
  output?: string;
  message?: string;
};

export function createRconSocket() {
  return io('/ws/rcon', {
    path: '/socket.io',
    withCredentials: true,
    transports: ['websocket']
  });
}

export async function sendRconCommand(serverId: string, command: string): Promise<RconResult> {
  return new Promise((resolve) => {
    const socket: Socket = createRconSocket();

    socket.on('connect', () => {
      socket.emit('command', { serverId, command }, (response: RconResult) => {
        socket.disconnect();
        resolve(response);
      });
    });

    socket.on('connect_error', (error) => {
      socket.disconnect();
      resolve({ ok: false, message: error.message });
    });

    setTimeout(() => {
      if (socket.connected) {
        return;
      }

      socket.disconnect();
      resolve({ ok: false, message: 'RCON websocket timed out' });
    }, 8000);
  });
}