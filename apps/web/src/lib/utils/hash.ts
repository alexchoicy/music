import { createBLAKE3 } from "hash-wasm";

export async function hashFileStream(
	file: File,
): Promise<{ blake3Hash: string }> {
	const blake3 = await createBLAKE3();

	const reader = file.stream().getReader();

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		blake3.update(value);
	}

	const blake3Hash = blake3.digest("hex");

	return { blake3Hash };
}

export async function hashBlake3FileUnit8Array(params: Uint8Array) {
	const blake3 = await createBLAKE3();

	blake3.update(params);

	const blake3Hash = blake3.digest("hex");

	return blake3Hash;
}

const SAMPLE_SIZE = 5 * 1024 * 1024; //5MB head last

export async function hashBlake3Simple(file: File) {
	const blake3 = await createBLAKE3();

	if (file.size <= SAMPLE_SIZE * 2) {
		const bytes = new Uint8Array(await file.arrayBuffer());
		blake3.update(bytes);
		return { blake3Hash: blake3.digest("hex") };
	}

	const firstChunk = new Uint8Array(
		await file.slice(0, SAMPLE_SIZE).arrayBuffer(),
	);
	const lastChunk = new Uint8Array(
		await file.slice(file.size - SAMPLE_SIZE).arrayBuffer(),
	);

	blake3.update(firstChunk);
	blake3.update(lastChunk);

	return { blake3Hash: blake3.digest("hex") };
}
