import { Test, TestingModule } from '@nestjs/testing';
import { LocalController } from './local.controller.js';
import { LocalService } from './local.service.js';

describe('LocalController', () => {
	let controller: LocalController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [LocalController],
			providers: [LocalService],
		}).compile();

		controller = module.get<LocalController>(LocalController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
