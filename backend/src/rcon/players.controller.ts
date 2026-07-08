import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Audit } from '../audit/audit.decorator';
import { Roles } from '../auth/roles.decorator';
import { RconService } from './rcon.service';

type ReasonBody = {
  reason?: string;
};

@Controller('servers/:id/players')
@Roles('Admin', 'Operator', 'Viewer')
export class PlayersController {
  constructor(private readonly rcon: RconService) {}

  @Get()
  async listPlayers(@Param('id') id: string) {
    return {
      serverId: id,
      output: await this.rcon.listPlayers(id)
    };
  }

  @Post(':player/kick')
  @Roles('Admin', 'Operator')
  @Audit({ action: 'player:kick', targetType: 'player', targetIdParam: 'player' })
  async kick(@Param('id') id: string, @Param('player') player: string, @Body() body: ReasonBody) {
    return {
      ok: true,
      serverId: id,
      output: await this.rcon.kick(id, player, body.reason ?? '')
    };
  }

  @Post(':player/ban')
  @Roles('Admin', 'Operator')
  @Audit({ action: 'player:ban', targetType: 'player', targetIdParam: 'player' })
  async ban(@Param('id') id: string, @Param('player') player: string, @Body() body: ReasonBody) {
    return {
      ok: true,
      serverId: id,
      output: await this.rcon.ban(id, player, body.reason ?? '')
    };
  }

  @Post(':player/pardon')
  @Roles('Admin', 'Operator')
  @Audit({ action: 'player:pardon', targetType: 'player', targetIdParam: 'player' })
  async pardon(@Param('id') id: string, @Param('player') player: string) {
    return {
      ok: true,
      serverId: id,
      output: await this.rcon.pardon(id, player)
    };
  }
}