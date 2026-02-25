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
