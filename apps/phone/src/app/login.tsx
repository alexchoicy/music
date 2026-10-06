import { useForm } from "@tanstack/react-form";
import { useRef } from "react";
import type { TextInput } from "react-native";
import { Text, View } from "react-native";
import { z } from "zod";

import { AuthLayout } from "@/components/ui/authLayout";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/textField";
import { login } from "@/queries/auth";
import { useSessionStore } from "@/store/sessionStore";

const loginSchema = z.object({
	username: z.string().min(1, "Enter your username"),
	password: z.string().min(1, "Enter your password"),
});

export default function LoginScreen() {
	const serverUrl = useSessionStore((state) => state.serverUrl);
	const setServerUrl = useSessionStore((state) => state.setServerUrl);
	const setToken = useSessionStore((state) => state.setToken);
	const passwordRef = useRef<TextInput>(null);

	const form = useForm({
		defaultValues: { username: "", password: "" },
		validators: { onSubmit: loginSchema },
		onSubmit: async ({ value }) => {
			let token: string;
			try {
				({ token } = await login(value));
			} catch {
				form.setFieldMeta("password", (prev) => ({
					...prev,
					errorMap: {
						...prev.errorMap,
						onSubmit: [{ message: "Wrong username or password" }],
					},
				}));
				return;
			}
			await setToken(token);
		},
	});

	return (
		<AuthLayout
			description="Sign in to listen to your music library."
			title="Welcome back"
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

			<View className="items-center gap-1 rounded-2xl bg-surface p-4">
				<Text className="text-xs text-muted-foreground">Server</Text>
				<Text className="text-sm font-medium text-foreground" numberOfLines={1}>
					{serverUrl}
				</Text>
				<Button
					className="h-10"
					onPress={() => void setServerUrl(null)}
					variant="ghost"
				>
					Change server
				</Button>
			</View>
		</AuthLayout>
	);
}
