import { Button } from "#/components/coss/button"
import {
	Card,
	CardDescription,
	CardHeader,
	CardPanel,
	CardTitle,
} from "#/components/coss/card"
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "#/components/coss/field"
import { Input } from "#/components/coss/input"
import { authMutations, authQueries } from "#/lib/queries/auth.queries"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

export const Route = createFileRoute("/_public/login/")({
	validateSearch: (search) => ({
		redirect: (search.redirect as string) || "/",
	}),
	beforeLoad: async ({ context, search }) => {
		const status = await context.queryClient.fetchQuery({
			...authQueries.checkAuth(),
			staleTime: 0,
		})
		if (status) throw redirect({ to: search.redirect })
	},
	component: RouteComponent,
})

const loginRequestDto = z.object({
	username: z.string().min(1, "Username is required"),
	password: z.string().min(1, "Password is required"),
})

const usernameInputId = "login-username"
const passwordInputId = "login-password"

function RouteComponent() {
	const queryClient = useQueryClient()
	const navigate = useNavigate()
	const { redirect: redirectTo } = Route.useSearch()

	const { isPending, mutateAsync: loginSubmit } = useMutation({
		...authMutations.login(),
	})

	const form = useForm({
		defaultValues: {
			username: "",
			password: "",
		},
		validators: {
			onSubmit: loginRequestDto,
		},
		onSubmit: async ({ value }) => {
			try {
				await loginSubmit(value)
			} catch {
				form.setFieldMeta("password", (prev) => ({
					...prev,
					errorMap: {
						...prev.errorMap,
						onSubmit: [{ message: "Invalid username or password" }],
					},
				}))
				return
			}

			await queryClient.invalidateQueries({ queryKey: ["auth"] })
			await navigate({ to: redirectTo })
		},
	})

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
							event.preventDefault()
							void form.handleSubmit()
						}}
					>
						<form.Field name="username">
							{(field) => {
								const error = field.state.meta.errors[0]?.message

								return (
									<Field
										dirty={field.state.meta.isDirty}
										invalid={!field.state.meta.isValid}
										name={field.name}
										touched={field.state.meta.isTouched}
									>
										<FieldLabel htmlFor={usernameInputId}>Username</FieldLabel>
										<Input
											autoComplete="username"
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
								)
							}}
						</form.Field>

						<form.Field name="password">
							{(field) => {
								const error = field.state.meta.errors[0]?.message

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
								)
							}}
						</form.Field>

						<form.Subscribe
							selector={(state) => [state.canSubmit, state.isSubmitting]}
						>
							{([canSubmit, isSubmitting]) => (
								<Button
									className="w-full"
									disabled={!canSubmit}
									loading={isSubmitting || isPending}
									type="submit"
								>
									Sign in
								</Button>
							)}
						</form.Subscribe>
					</form>
				</CardPanel>
			</Card>
		</main>
	)
}
