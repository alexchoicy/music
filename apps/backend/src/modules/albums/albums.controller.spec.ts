import { Test, TestingModule } from '@nestjs/testing';
import { AlbumsController } from './albums.controller.js';
import { AlbumsService } from './albums.service.js';

describe('AlbumsController', () => {
	let controller: AlbumsController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AlbumsController],
			providers: [AlbumsService],
		}).compile();

		controller = module.get<AlbumsController>(AlbumsController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
