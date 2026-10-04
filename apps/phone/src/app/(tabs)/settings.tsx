import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { authQueries } from "@/lib/queries/auth.queries";
import { useSessionStore } from "@/store/sessionStore";

export default function SettingsScreen() {
	const queryClient = useQueryClient();
	const serverUrl = useSessionStore((state) => state.serverUrl);
	const setToken = useSessionStore((state) => state.setToken);
	const { data: userInfo } = useQuery(authQueries.userInfo());

	async function signOut() {
		await setToken(null);
		queryClient.clear();
	}

	return (
		<Screen>
			<View className="gap-4 p-4">
				<View className="gap-1">
					{userInfo && (
						<Text className="text-base text-foreground">
							Signed in as {userInfo.userName}
						</Text>
					)}
					<Text className="text-sm text-muted-foreground" numberOfLines={1}>
						{serverUrl}
					</Text>
				</View>
				<Button onPress={() => void signOut()} variant="outline">
					Sign out
				</Button>
			</View>
		</Screen>
	);
}
