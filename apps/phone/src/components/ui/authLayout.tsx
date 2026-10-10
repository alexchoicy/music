import type { ReactNode } from "react";
import { KeyboardAvoidingView, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";

type AuthLayoutProps = {
	title: string;
	description: string;
	children: ReactNode;
};

export function AuthLayout({ title, description, children }: AuthLayoutProps) {
	const insets = useSafeAreaInsets();

	return (
		<KeyboardAvoidingView
			behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
			className="flex-1 bg-background"
		>
			<ScrollView
				contentContainerClassName="grow justify-center px-6"
				contentContainerStyle={{
					paddingTop: insets.top + 24,
					paddingBottom: insets.bottom + 24,
				}}
				keyboardShouldPersistTaps="handled"
			>
				<View className="w-full max-w-sm gap-8 self-center">
					<View className="gap-4">
						<View className="size-14 items-center justify-center rounded-2xl bg-primary">
							<Icon
								className="accent-primary-foreground"
								name="musicNote"
								size={30}
							/>
						</View>
						<View className="gap-1.5">
							<Text
								accessibilityRole="header"
								className="text-3xl font-bold tracking-tight text-foreground"
							>
								{title}
							</Text>
							<Text className="text-base leading-6 text-muted-foreground">
								{description}
							</Text>
						</View>
					</View>
					{children}
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}
