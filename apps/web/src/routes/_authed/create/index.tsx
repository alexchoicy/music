import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MusicDropBox } from "@/components/create/musicDropBox";
import { Button } from "@/components/shadcn/button";
import { AppLayout } from "@/components/ui/appLayout";
import { MusicUploadProvider } from "@/contexts/uploadMusicContext";

export const Route = createFileRoute("/_authed/create/")({
	component: RouteComponent,
});

function RouteComponent() {
	const [isProcessing, setIsProcessing] = useState(false);

	const onUpload = () => {};

	return (
		<AppLayout header={<Button onClick={onUpload}>Upload</Button>}>
			<MusicUploadProvider>
				<MusicDropBox
					isProcessing={isProcessing}
					setIsProcessing={setIsProcessing}
				/>
			</MusicUploadProvider>
		</AppLayout>
	);
}
