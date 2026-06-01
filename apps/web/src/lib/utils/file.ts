export async function getDimensions(file: Blob) {
	const bitmap = await createImageBitmap(file);

	const result = {
		width: bitmap.width,
		height: bitmap.height,
	};

	bitmap.close();
	return result;
}
