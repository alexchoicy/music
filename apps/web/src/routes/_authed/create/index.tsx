import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { UploadConcertContent } from "@/components/create/concert/UploadConertContent";
import { UploadAlbumContent } from "@/components/create/uploadAlbumContent";
import { Button } from "@/components/shadcn/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { AppLayout } from "@/components/ui/appLayout";
import { MusicUploadProvider } from "@/contexts/uploadMusicContext";

export const Route = createFileRoute("/_authed/create/")({
	component: RouteComponent,
});
function RouteComponent() {
	return (
		<MusicUploadProvider>
			<CreatePageContent />
		</MusicUploadProvider>
	);
}
function CreatePageContent() {
	const [isProcessing, setIsProcessing] = useState(false);

	type CreationTab = "albums" | "concert";

	const [creationTab, setCreationTab] = useState<CreationTab>("albums");
	// magical upload handling
	// onUploadReady will update the uploadAction
	// the upload button will trigger the handleUpload(check if uploadAction exists)
	const [uploadAction, setUploadAction] = useState<
		(() => Promise<void>) | null
	>(null);

	const onUploadReady = useCallback(
		(nextUploadAction: (() => Promise<void>) | null) => {
			setUploadAction(() => nextUploadAction);
		},
		[],
	);

	const handleUpload = useCallback(() => {
		if (!uploadAction) {
			return;
		}

		void uploadAction();
	}, [uploadAction]);

	return (
		<AppLayout
			header={
				<>
					<div className="flex justify-center">
						<Tabs
							value={creationTab}
							onValueChange={(value: CreationTab) => setCreationTab(value)}
						>
							<TabsList>
								<TabsTrigger value="albums">Albums</TabsTrigger>
								<TabsTrigger value="concert">Concerts</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>
					<div className="flex justify-end">
						<Button
							disabled={isProcessing || !uploadAction}
							onClick={handleUpload}
						>
							Upload
						</Button>
					</div>
				</>
			}
		>
			{creationTab === "albums" && (
				<UploadAlbumContent
					isProcessing={isProcessing}
					setIsProcessing={setIsProcessing}
					onUploadReady={onUploadReady}
				/>
			)}

			{creationTab === "concert" && (
				<UploadConcertContent
					isProcessing={isProcessing}
					setIsProcessing={setIsProcessing}
					onUploadReady={onUploadReady}
				/>
			)}
		</AppLayout>
	);
}
