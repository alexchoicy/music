import {
	browserSupportsWebAuthnAutofill,
	startAuthentication,
	startRegistration,
	WebAuthnAbortService,
} from "@simplewebauthn/browser";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { KeyRoundIcon } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";
import { z } from "zod";

import { AppMark } from "#/components/app/AppMark";
import { Button } from "#/components/base/button";
import { Field, FieldError, FieldLabel } from "#/components/base/field";
import { Input } from "#/components/base/input";
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
		const userInfo = await context.queryClient
			.query({ ...authQueries.userInfo(), staleTime: 0 })
			.catch(() => null);
		if (userInfo) throw redirect({ to: search.redirect });
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

	const startPasskeyAutofill = useEffectEvent(async () => {
		try {
			if (!(await browserSupportsWebAuthnAutofill())) return;
			await authenticateWithPasskey({ useBrowserAutofill: true });
		} catch (error) {
			if (
				error instanceof Error &&
				error.message === "Passkey sign-in failed"
			) {
				setPasskeyError(error.message);
			}
			return;
		}

		await finishLogin();
	});

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
		void startPasskeyAutofill();

		return () => {
			WebAuthnAbortService.cancelCeremony();
		};
	}, []);

	return (
		<main className="flex min-h-svh flex-col bg-background px-6 py-8 sm:px-12 sm:py-12">
			<header className="mx-auto flex w-full max-w-5xl items-center gap-3">
				<AppMark className="size-8" />
				<span className="text-lg font-semibold tracking-tight">Music</span>
			</header>
			<div className="mx-auto grid w-full max-w-sm flex-1 content-center py-12">
				<section
					className="mx-auto w-full max-w-sm"
					aria-labelledby="login-title"
				>
					<div className="mb-8">
						<h1 id="login-title" className="text-3xl font-bold tracking-tight">
							Sign in
						</h1>
					</div>
					<form
						className="grid gap-6"
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
											size="xl"
											autoComplete="username webauthn"
											autoCapitalize="none"
											spellCheck={false}
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
											size="xl"
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
									className="h-11 w-full sm:h-11"
									size="xl"
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
							className="h-11 w-full sm:h-11"
							size="xl"
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
				</section>
			</div>
		</main>
	);
}
