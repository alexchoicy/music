import { createBLAKE3, createSHA1 } from "hash-wasm";

export async function hashFileStream(
	file: File,
): Promise<{ blake3Hash: string; sha1Hash: string }> {
	const blake3 = await createBLAKE3();
	const sha1 = await createSHA1();

	const reader = file.stream().getReader();

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		blake3.update(value);
		sha1.update(value);
	}

	const blake3Hash = blake3.digest("hex");
	const sha1Hash = sha1.digest("hex");

	return { blake3Hash, sha1Hash };
}

export async function hashBlake3FileUnit8Array(params: Uint8Array) {
	const blake3 = await createBLAKE3();

	blake3.update(params);

	const blake3Hash = blake3.digest("hex");

	return blake3Hash;
}

export async function hashSHA1FileUnit8Array(params: Uint8Array) {
	const sha1 = await createSHA1();

	sha1.update(params);

	const sha1Hash = sha1.digest("hex");

	return sha1Hash;
}
