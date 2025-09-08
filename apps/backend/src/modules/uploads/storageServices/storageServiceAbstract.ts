export abstract class StorageService {
	abstract createPresignedMusicUploadUrl(
		albumId: string,
		trackId: string,
	): string | Promise<string>;
}
