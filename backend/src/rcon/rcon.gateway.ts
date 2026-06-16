import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';

@WebSocketGateway({ namespace: '/ws/rcon', cors: false })
export class RconGateway {
  @SubscribeMessage('command')
  command(@MessageBody() body: { serverId?: string; command?: string }) {
    return {
      ok: false,
      serverId: body.serverId,
      message: 'RCON command execution is planned after discovery and RBAC are implemented.'
    };
  }
}

