import type * as API from "@music/api";
import type { Accept } from "react-dropzone";

export const ALBUM_TITLE = "UNKNOWN ALBUM";

export const TRACK_TITLE = "UNKNOWN TRACK";

export const DEFAULT_TRACK_AUDIO_SOURCE: API.MediaSource = "UserUpload";

export const COVER_IMAGE_ACCEPT = "image/jpeg,image/png";

export const ALBUM_COVER_ASPECT_RATIO = 1;

export const AUDIO_FILE_ACCEPT: Accept = {
	"audio/*": [".flac", ".mp3", ".wav", ".dsf"],
};
