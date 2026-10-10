import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { AuthLayout } from "@/components/ui/authLayout";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/textField";
import { checkServer, normalizeServerUrl } from "@/lib/api";
import { useSessionStore } from "@/store/sessionStore";

const serverSchema = z.object({
	serverUrl: z
		.string()
		.trim()
		.min(1, "Enter your server's address")
		.refine((value) => normalizeServerUrl(value) !== null, {
			message: __DEV__
				? "Enter an http:// or https:// address"
				: "Enter an https:// address",
		}),
});

export default function SetupScreen() {
	const setServerUrl = useSessionStore((state) => state.setServerUrl);

	const form = useForm({
		defaultValues: { serverUrl: "" },
		validators: { onSubmit: serverSchema },
		onSubmit: async ({ value }) => {
			const serverUrl = normalizeServerUrl(value.serverUrl);
			if (!serverUrl) return;

			if (!(await checkServer(serverUrl))) {
				form.setFieldMeta("serverUrl", (prev) => ({
					...prev,
					errorMap: {
						...prev.errorMap,
						onSubmit: [{ message: "Couldn't reach a Music server there" }],
					},
				}));
				return;
			}

			await setServerUrl(serverUrl);
		},
	});

	return (
		<AuthLayout
			description="Enter the address of your Music server to get started."
			title="Connect to your library"
		>
			<form.Field name="serverUrl">
				{(field) => (
					<TextField
						autoCapitalize="none"
						autoComplete="url"
						autoCorrect={false}
						autoFocus
						description="For example, music.example.com"
						enterKeyHint="go"
						error={field.state.meta.errors[0]?.message}
						inputMode="url"
						label="Server address"
						onBlur={field.handleBlur}
						onChangeText={field.handleChange}
						onSubmitEditing={() => void form.handleSubmit()}
						placeholder="https://"
						textContentType="URL"
						value={field.state.value}
					/>
				)}
			</form.Field>

			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting]}
			>
				{([canSubmit, isSubmitting]) => (
					<Button
						disabled={!canSubmit}
						loading={isSubmitting}
						onPress={() => void form.handleSubmit()}
					>
						Continue
					</Button>
				)}
			</form.Subscribe>
		</AuthLayout>
	);
}
