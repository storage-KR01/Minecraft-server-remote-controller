import { BadRequestException, Injectable } from '@nestjs/common';
import { createDecipheriv, createHash } from 'crypto';
import { Rcon } from 'rcon-client';
import { DiscoveryService } from '../discovery/discovery.service';

type ServerWithSecrets = Awaited<ReturnType<DiscoveryService['getById']>>;

function deriveKey(secret?: string) {
  if (!secret) {
    return null;
  }

  return createHash('sha256').update(secret).digest();
}

function decryptSecret(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const [prefix, ivBase64, tagBase64, ciphertextBase64] = value.split(':');
  if (prefix !== 'enc:v1' || !ivBase64 || !tagBase64 || !ciphertextBase64) {
    return null;
  }

  const key = deriveKey(process.env.DATA_ENCRYPTION_KEY);
  if (!key) {
    return null;
  }

  const iv = Buffer.from(ivBase64, 'base64');
  const tag = Buffer.from(tagBase64, 'base64');
  const ciphertext = Buffer.from(ciphertextBase64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

@Injectable()
export class RconService {
  constructor(private readonly discovery: DiscoveryService) {}

  async run(serverId: string, command: string): Promise<string> {
    const server = await this.discovery.getById(serverId);
    return this.runOnServer(server, command);
  }

  async runOnServer(server: ServerWithSecrets, command: string): Promise<string> {
    const trimmed = command.trim();
    if (!trimmed) {
      throw new BadRequestException('Command cannot be empty');
    }

    if (!server.rconPort) {
      throw new BadRequestException('Server chưa cấu hình rcon.port');
    }

    const password = decryptSecret(server.rconPasswordEnc);
    if (!password) {
      throw new BadRequestException('Server chưa có rcon_password_enc hợp lệ');
    }

    const connection = await Rcon.connect({
      host: '127.0.0.1',
      port: server.rconPort,
      password,
      timeout: 5000
    });

    try {
      return await connection.send(trimmed);
    } finally {
      await connection.end();
    }
  }

  async listPlayers(serverId: string): Promise<string> {
    return this.run(serverId, 'list');
  }

  async broadcast(serverId: string, message: string): Promise<string> {
    return this.run(serverId, `say ${message}`);
  }

  async kick(serverId: string, player: string, reason = ''): Promise<string> {
    const suffix = reason.trim() ? ` ${reason.trim()}` : '';
    return this.run(serverId, `kick ${player}${suffix}`);
  }

  async ban(serverId: string, player: string, reason = ''): Promise<string> {
    const suffix = reason.trim() ? ` ${reason.trim()}` : '';
    return this.run(serverId, `ban ${player}${suffix}`);
  }

  async pardon(serverId: string, player: string): Promise<string> {
    return this.run(serverId, `pardon ${player}`);
  }
}