import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PmfbyService } from './pmfby.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
  ],
  providers: [PmfbyService],
  exports: [PmfbyService],
})
export class PmfbyModule {} 