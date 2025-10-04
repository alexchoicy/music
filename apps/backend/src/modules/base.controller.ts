import { Controller, Get } from '@nestjs/common';

@Controller('')
export class BaseController {
	constructor() {}
	@Get()
	getStatus() {
		return {
			status: 'ok',
		};
	}
}
