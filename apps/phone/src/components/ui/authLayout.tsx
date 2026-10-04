import type { ReactNode } from "react";
import { KeyboardAvoidingView, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
				contentContainerClassName="grow justify-center p-6"
				contentContainerStyle={{
					paddingTop: insets.top + 24,
					paddingBottom: insets.bottom + 24,
				}}
				keyboardShouldPersistTaps="handled"
			>
				<View className="w-full max-w-sm gap-6 self-center">
					<View className="gap-1.5">
						<Text className="text-2xl font-semibold text-foreground">
							{title}
						</Text>
						<Text className="text-base text-muted-foreground">
							{description}
						</Text>
					</View>
					{children}
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}
