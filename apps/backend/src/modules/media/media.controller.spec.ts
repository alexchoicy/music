import { Test, TestingModule } from '@nestjs/testing';
import { MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';

describe('MediaController', () => {
	let controller: MediaController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [MediaController],
			providers: [MediaService],
		}).compile();

		controller = module.get<MediaController>(MediaController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
