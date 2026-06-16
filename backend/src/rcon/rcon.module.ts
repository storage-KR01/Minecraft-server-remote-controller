import { Module } from '@nestjs/common';
import { RconGateway } from './rcon.gateway';

@Module({
  providers: [RconGateway]
})
export class RconModule {}

