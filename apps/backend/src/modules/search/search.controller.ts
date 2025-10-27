import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service.js';

@Controller('search')
export class SearchController {
	constructor(private readonly migrationService: SearchService) {}

	@Get()
	async search(@Query('text') text: string) {
		return this.migrationService.search(text);
	}
}
