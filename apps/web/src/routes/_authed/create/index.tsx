import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MusicDropBox } from "@/components/create/musicDropBox";
import { Button } from "@/components/shadcn/button";
import { AppLayout } from "@/components/ui/appLayout";
import type { CreateAlbum } from "@/models/uploadMusic";

export const Route = createFileRoute("/_authed/create/")({
	component: RouteComponent,
});

function RouteComponent() {
	const [isProcessing, setIsProcessing] = useState(false);
	// Blake3, File
	const [uploadFile, setUploadFile] = useState<Map<string, File>>(new Map());
	// albumName, CreateAlbum
	const [uploadAlbum, setUploadAlbum] = useState<Map<string, CreateAlbum>>(
		new Map(),
	);

	const onUpload = () => {};

	return (
		<AppLayout header={<Button onClick={onUpload}>Upload</Button>}>
			<MusicDropBox
				isProcessing={isProcessing}
				setIsProcessing={setIsProcessing}
				uploadFile={uploadFile}
				setUploadFile={setUploadFile}
			/>
		</AppLayout>
	);
}
