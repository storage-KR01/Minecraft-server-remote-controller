import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { DiscoveryService } from '../discovery/discovery.service';
import { RconService } from './rcon.service';

type GatewayUser = {
  id: string;
  username: string;
  role: 'Admin' | 'Operator' | 'Viewer';
  mustChangePassword: boolean;
};

type GatewaySocket = Socket & {
  data: {
    user?: GatewayUser;
  };
};

@WebSocketGateway({ namespace: '/ws/rcon', cors: false })
export class RconGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly auth: AuthService,
    private readonly discovery: DiscoveryService,
    private readonly rcon: RconService,
    private readonly audit: AuditService
  ) {}

  async handleConnection(client: GatewaySocket) {
    const cookieHeader = client.handshake.headers.cookie ?? '';
    const sessionToken = this.extractCookie(cookieHeader, 'scc_session');

    if (!sessionToken) {
      client.disconnect(true);
      return;
    }

    try {
      const user = await this.auth.validateSession(sessionToken);
      client.data.user = user;
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: GatewaySocket) {
    delete client.data.user;
  }

  @SubscribeMessage('command')
  async command(@ConnectedSocket() client: GatewaySocket, @MessageBody() body: { serverId?: string; command?: string }) {
    if (!client.data.user) {
      return {
        ok: false,
        message: 'Unauthenticated websocket session'
      };
    }

    const serverId = body.serverId?.trim();
    const command = body.command?.trim();

    if (!serverId || !command) {
      return {
        ok: false,
        serverId,
        message: 'serverId and command are required'
      };
    }

    const server = await this.discovery.getById(serverId);

    if (!server.rconPort || !server.rconPasswordEnc) {
      return {
        ok: false,
        serverId,
        message: 'Server chưa sẵn sàng cho RCON'
      };
    }

    try {
      const output = await this.rcon.runOnServer(server, command);
      await this.audit.record({
        actorUserId: client.data.user.id,
        action: 'console:command_run',
        targetType: 'server',
        targetId: serverId,
        metadata: { command }
      });

      return {
        ok: true,
        serverId,
        output
      };
    } catch (error) {
      return {
        ok: false,
        serverId,
        message: error instanceof Error ? error.message : 'RCON command failed'
      };
    }
  }

  private extractCookie(cookieHeader: string, key: string): string | null {
    for (const part of cookieHeader.split(';')) {
      const [rawName, ...rawValue] = part.trim().split('=');
      if (rawName === key) {
        return rawValue.join('=') || null;
      }
    }

    return null;
  }
}

