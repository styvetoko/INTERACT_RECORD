import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { ArtistsController } from './artists.controller';
import { ArtistsService } from './artists.service';

@Module({ imports: [MediaModule], controllers: [ArtistsController], providers: [ArtistsService], exports: [ArtistsService] })
export class ArtistsModule {}
