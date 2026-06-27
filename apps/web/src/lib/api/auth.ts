import type {
	AuthenticationResponseJSON,
	PublicKeyCredentialCreationOptionsJSON,
	PublicKeyCredentialRequestOptionsJSON,
	RegistrationResponseJSON,
} from "@simplewebauthn/browser";

import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

export type Passkey = {
	id: string;
	name: string;
	createdAt: string;
	transports: string[];
	deviceType: string;
};

export async function passkeyAuthenticationOptions(username?: string) {
	const search = username ? `?username=${encodeURIComponent(username)}` : "";
	const result = await $APIFetch<PublicKeyCredentialRequestOptionsJSON>(
		`/auth/passkey-request-options${search}`,
		{
			method: "POST",
		},
	);

	if (!result.ok) {
		throw new Error("Failed to load passkey sign-in options");
	}

	return result.data;
}

export async function signInWithPasskey(assertion: AuthenticationResponseJSON) {
	const result = await $APIFetch<components["schemas"]["LoginResult"]>(
		"/auth/passkey-signin",
		{
			method: "POST",
			body: JSON.stringify(assertion),
		},
	);

	if (!result.ok) {
		throw new Error("Passkey sign-in failed");
	}

	return result.data;
}

export async function passkeyRegistrationOptions() {
	const result = await $APIFetch<PublicKeyCredentialCreationOptionsJSON>(
		"/auth/passkey-creation-options",
		{
			method: "POST",
		},
	);

	if (!result.ok) {
		throw new Error("Failed to load passkey registration options");
	}

	return result.data;
}

export async function registerPasskey(attResp: RegistrationResponseJSON) {
	const result = await $APIFetch<Passkey>("/auth/passkey-register", {
		method: "POST",
		body: JSON.stringify(attResp),
	});

	if (!result.ok) {
		throw new Error("Failed to register passkey");
	}

	return result.data;
}

export async function getPasskeys() {
	const result = await $APIFetch<Passkey[]>("/auth/passkeys");
	if (!result.ok) throw new Error("Failed to load passkeys");
	return result.data;
}

export async function renamePasskey(data: Pick<Passkey, "id" | "name">) {
	const result = await $APIFetch("/auth/passkeys", {
		method: "POST",
		body: JSON.stringify(data),
	});

	if (!result.ok) {
		throw new Error("Failed to rename passkey");
	}
}

export async function deletePasskey(id: string) {
	const result = await $APIFetch("/auth/passkeys", {
		method: "DELETE",
		body: JSON.stringify({ id }),
	});

	if (!result.ok) {
		throw new Error("Failed to delete passkey");
	}
}
