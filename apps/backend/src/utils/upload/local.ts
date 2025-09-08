import fs from 'fs';
import path from 'path';

export function saveCoverImage(
	dir: string,
	attachmentID: string,
	imageBuffer: Buffer,
	ext: string,
): string {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	fs.writeFileSync(path.join(dir, `${attachmentID}.${ext}`), imageBuffer);
	return `${attachmentID}.${ext}`;
}
