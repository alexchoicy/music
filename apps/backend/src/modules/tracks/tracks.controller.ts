import { Controller, Get, Param } from '@nestjs/common';
import { TracksService } from './tracks.service.js';

@Controller('tracks')
export class TrackController {
	constructor(private readonly tracksService: TracksService) {}

	@Get(':id')
	async getTrack(@Param('id') id: string) {
		return await this.tracksService.getTrack(id);
	}
}
