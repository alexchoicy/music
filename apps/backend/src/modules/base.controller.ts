import { Controller, Get } from '@nestjs/common';

@Controller('')
export class BaseController {
	constructor() {}

	@Get()
	async getStatus() {
		await sleep(1000);
		function sleep(ms: any) {
			return new Promise((resolve) => {
				setTimeout(resolve, ms);
			});
		}

		return {
			status: 'ok',
		};
	}
}
