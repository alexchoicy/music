export abstract class StorageService {
	abstract createPresignedMusicUploadUrl(
		albumId: string,
		trackId: string,
	): string | Promise<string>;

	abstract getMusicDataUrl(trackHash: string, quality: string, ext: string): string | Promise<string>;

	abstract getAlbumCoverDataUrl(attachmentID: string, ext: string): string | Promise<string>;
}
