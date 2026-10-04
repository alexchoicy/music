import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import type { TextInput } from "react-native";
import { Text, View } from "react-native";
import { z } from "zod";

import { AuthLayout } from "@/components/ui/authLayout";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/textField";
import { authMutations } from "@/lib/queries/auth.queries";
import { useSessionStore } from "@/store/sessionStore";

const loginRequestDto = z.object({
	username: z.string().min(1, "Username is required"),
	password: z.string().min(1, "Password is required"),
});

export default function LoginScreen() {
	const serverUrl = useSessionStore((state) => state.serverUrl);
	const setServerUrl = useSessionStore((state) => state.setServerUrl);
	const setToken = useSessionStore((state) => state.setToken);
	const passwordRef = useRef<TextInput>(null);

	const { mutateAsync: loginSubmit } = useMutation({
		...authMutations.login(),
	});

	const form = useForm({
		defaultValues: {
			username: "",
			password: "",
		},
		validators: {
			onSubmit: loginRequestDto,
		},
		onSubmit: async ({ value }) => {
			let token: string;

			try {
				({ token } = await loginSubmit(value));
			} catch {
				form.setFieldMeta("password", (prev) => ({
					...prev,
					errorMap: {
						...prev.errorMap,
						onSubmit: [{ message: "Invalid username or password" }],
					},
				}));
				return;
			}

			await setToken(token);
		},
	});

	return (
		<AuthLayout
			description="Enter your credentials to continue to your music library."
			title="Sign in"
		>
			<View className="gap-4">
				<form.Field name="username">
					{(field) => (
						<TextField
							autoCapitalize="none"
							autoComplete="username"
							autoCorrect={false}
							enterKeyHint="next"
							error={field.state.meta.errors[0]?.message}
							label="Username"
							onBlur={field.handleBlur}
							onChangeText={field.handleChange}
							onSubmitEditing={() => passwordRef.current?.focus()}
							submitBehavior="submit"
							textContentType="username"
							value={field.state.value}
						/>
					)}
				</form.Field>

				<form.Field name="password">
					{(field) => (
						<TextField
							autoCapitalize="none"
							autoComplete="current-password"
							autoCorrect={false}
							description="Use the password for your account."
							enterKeyHint="go"
							error={field.state.meta.errors[0]?.message}
							label="Password"
							onBlur={field.handleBlur}
							onChangeText={field.handleChange}
							onSubmitEditing={() => void form.handleSubmit()}
							ref={passwordRef}
							secureTextEntry
							textContentType="password"
							value={field.state.value}
						/>
					)}
				</form.Field>
			</View>

			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting]}
			>
				{([canSubmit, isSubmitting]) => (
					<Button
						disabled={!canSubmit}
						loading={isSubmitting}
						onPress={() => void form.handleSubmit()}
					>
						Sign in
					</Button>
				)}
			</form.Subscribe>

			<View className="items-center gap-1">
				<Text className="text-sm text-muted-foreground" numberOfLines={1}>
					{serverUrl}
				</Text>
				<Button onPress={() => void setServerUrl(null)} variant="ghost">
					Change server
				</Button>
			</View>
		</AuthLayout>
	);
}
