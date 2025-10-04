import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';

@Controller('')
export class BaseController {
	constructor() {}
	@Get()
	getStatus(@Req() req: Request) {
		return {
			status: 'ok',
			info: req.user,
		};
	}
}
