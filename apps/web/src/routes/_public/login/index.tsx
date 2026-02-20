import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import z from "zod";
import { Button } from "@/components/shadcn/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/shadcn/card";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/shadcn/field";
import { Input } from "@/components/shadcn/input";
import { authMutations, authQueries } from "@/lib/queries/auth.queries";

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

function RouteComponent() {
	const navigate = useNavigate();
	const { redirect } = Route.useSearch();

	const { mutateAsync: loginSubmit, isError } = useMutation({
		...authMutations.login(),
		onError: () => {
			form.setFieldMeta("password", (prev) => ({
				...prev,
				errorMap: { onSubmit: [{ message: "Invalid username or password" }] },
			}));
		},
	});

	const LoginRequestDto = z.object({
		username: z.string().min(1, "Username is required"),
		password: z.string().min(1, "Password is required"),
	});

	const form = useForm({
		defaultValues: {
			username: "",
			password: "",
		},
		validators: {
			onSubmit: LoginRequestDto,
		},
		onSubmit: async (values) => {
			const data = LoginRequestDto.parse(values.value);

			await loginSubmit(data);
			if (!isError) {
				navigate({ to: redirect });
			}
		},
	});

	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle>Login to your account</CardTitle>
					<CardDescription>
						Enter your username and password below to login to your account
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							form.handleSubmit();
						}}
					>
						<FieldGroup>
							<form.Field name="username">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Username</FieldLabel>
											<Input
												type="text"
												id={field.name}
												name={field.name}
												value={field.state.value}
												onChange={(e) => field.handleChange(e.target.value)}
												aria-invalid={isInvalid}
												placeholder="Your username"
												required
											/>
										</Field>
									);
								}}
							</form.Field>
							<form.Field name="password">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Password</FieldLabel>
											<Input
												type="password"
												id={field.name}
												name={field.name}
												value={field.state.value}
												aria-invalid={isInvalid}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="Your password"
											/>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>
							<Field>
								<Button type="submit" className="w-full">
									Login
								</Button>
							</Field>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
