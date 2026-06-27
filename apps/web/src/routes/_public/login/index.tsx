import {
	browserSupportsWebAuthnAutofill,
	startAuthentication,
	startRegistration,
} from "@simplewebauthn/browser";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { KeyRoundIcon } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";
import { z } from "zod";

import { Button } from "#/components/coss/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardPanel,
	CardTitle,
} from "#/components/coss/card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "#/components/coss/field";
import { Input } from "#/components/coss/input";
import {
	passkeyAuthenticationOptions,
	passkeyRegistrationOptions,
	registerPasskey,
	signInWithPasskey,
} from "#/lib/api/auth";
import { authMutations, authQueries } from "#/lib/queries/auth.queries";

export const Route = createFileRoute("/_public/login/")({
	validateSearch: (search) => ({
		redirect: (search.redirect as string) || "/",
	}),
	beforeLoad: async ({ context, search }) => {
		const status = await context.queryClient.fetchQuery({
			...authQueries.checkAuth(),
			staleTime: 0,
		});
		if (status) throw redirect({ to: search.redirect });
	},
	component: RouteComponent,
});

const loginRequestDto = z.object({
	username: z.string().min(1, "Username is required"),
	password: z.string().min(1, "Password is required"),
});

const usernameInputId = "login-username";
const passwordInputId = "login-password";

async function authenticateWithPasskey({
	username,
	useBrowserAutofill = false,
}: {
	username?: string;
	useBrowserAutofill?: boolean;
} = {}) {
	const optionsJSON = await passkeyAuthenticationOptions(username);
	const assertion = await startAuthentication({
		optionsJSON,
		useBrowserAutofill,
	});
	return signInWithPasskey(assertion);
}

async function autoRegisterPasskey() {
	const optionsJSON = await passkeyRegistrationOptions();
	const attResp = await startRegistration({
		optionsJSON,
		useAutoRegister: true,
	});
	await registerPasskey(attResp);
}

function RouteComponent() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { redirect: redirectTo } = Route.useSearch();
	const [passkeyError, setPasskeyError] = useState<string | null>(null);

	const { isPending, mutateAsync: loginSubmit } = useMutation({
		...authMutations.login(),
	});
	const { isPending: isPasskeyPending, mutateAsync: passkeySubmit } =
		useMutation({
			mutationFn: (username?: string) => authenticateWithPasskey({ username }),
		});

	async function finishLogin() {
		await queryClient.invalidateQueries({ queryKey: ["auth"] });
		await navigate({ to: redirectTo });
	}

	async function completedPasswordLogin() {
		try {
			await autoRegisterPasskey();
		} catch {}

		await finishLogin();
	}

	const startPasskeyAutofill = useEffectEvent(
		async (isActive: () => boolean) => {
			try {
				if (!(await browserSupportsWebAuthnAutofill())) return;
				await authenticateWithPasskey({ useBrowserAutofill: true });
			} catch (error) {
				if (
					isActive() &&
					error instanceof Error &&
					error.message === "Passkey sign-in failed"
				) {
					setPasskeyError(error.message);
				}
				return;
			}

			if (isActive()) await finishLogin();
		},
	);

	async function handlePasskeyLogin() {
		setPasskeyError(null);

		try {
			const username = form.state.values.username.trim() || undefined;
			await passkeySubmit(username);
		} catch (error) {
			setPasskeyError(
				error instanceof Error ? error.message : "Passkey sign-in failed",
			);
			return;
		}

		await finishLogin();
	}

	const form = useForm({
		defaultValues: {
			username: "",
			password: "",
		},
		validators: {
			onSubmit: loginRequestDto,
		},
		onSubmit: async ({ value }) => {
			setPasskeyError(null);

			try {
				await loginSubmit(value);
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

			await completedPasswordLogin();
		},
	});

	useEffect(() => {
		let active = true;
		void startPasskeyAutofill(() => active);

		return () => {
			active = false;
		};
	}, []);

	return (
		<main className="flex min-h-svh items-center justify-center p-6">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Sign in</CardTitle>
					<CardDescription>
						Enter your credentials to continue to your music library.
					</CardDescription>
				</CardHeader>
				<CardPanel>
					<form
						className="grid gap-4"
						onSubmit={(event) => {
							event.preventDefault();
							void form.handleSubmit();
						}}
					>
						<form.Field name="username">
							{(field) => {
								const error = field.state.meta.errors[0]?.message;

								return (
									<Field
										dirty={field.state.meta.isDirty}
										invalid={!field.state.meta.isValid}
										name={field.name}
										touched={field.state.meta.isTouched}
									>
										<FieldLabel htmlFor={usernameInputId}>Username</FieldLabel>
										<Input
											autoComplete="username webauthn"
											id={usernameInputId}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={(event) =>
												field.handleChange(event.target.value)
											}
											aria-invalid={Boolean(error) || undefined}
											type="text"
											value={field.state.value}
										/>
										<FieldError match={Boolean(error)}>{error}</FieldError>
									</Field>
								);
							}}
						</form.Field>

						<form.Field name="password">
							{(field) => {
								const error = field.state.meta.errors[0]?.message;

								return (
									<Field
										dirty={field.state.meta.isDirty}
										invalid={!field.state.meta.isValid}
										name={field.name}
										touched={field.state.meta.isTouched}
									>
										<FieldLabel htmlFor={passwordInputId}>Password</FieldLabel>
										<Input
											autoComplete="current-password"
											id={passwordInputId}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={(event) =>
												field.handleChange(event.target.value)
											}
											aria-invalid={Boolean(error) || undefined}
											type="password"
											value={field.state.value}
										/>
										<FieldDescription>
											Use the password for your account.
										</FieldDescription>
										<FieldError match={Boolean(error)}>{error}</FieldError>
									</Field>
								);
							}}
						</form.Field>

						<form.Subscribe
							selector={(state) => [state.canSubmit, state.isSubmitting]}
						>
							{([canSubmit, isSubmitting]) => (
								<Button
									className="w-full"
									disabled={!canSubmit || isPasskeyPending}
									loading={isSubmitting || isPending}
									type="submit"
								>
									Sign in
								</Button>
							)}
						</form.Subscribe>

						<div className="flex items-center gap-3 text-xs text-muted-foreground">
							<div className="h-px flex-1 bg-border" />
							<span>or</span>
							<div className="h-px flex-1 bg-border" />
						</div>

						<Button
							className="w-full"
							disabled={isPending || isPasskeyPending}
							loading={isPasskeyPending}
							onClick={() => void handlePasskeyLogin()}
							type="button"
							variant="outline"
						>
							<KeyRoundIcon />
							Sign in with passkey
						</Button>
						{passkeyError && (
							<p className="text-sm text-destructive-foreground" role="alert">
								{passkeyError}
							</p>
						)}
					</form>
				</CardPanel>
			</Card>
		</main>
	);
}
