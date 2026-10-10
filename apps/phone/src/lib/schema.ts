import type { components } from "@/data/APIschema";

type Schemas = components["schemas"];

export type AlbumType = Schemas["AlbumType"];
export type AlbumListItem = Schemas["AlbumListItem"];
export type AlbumDetails = Schemas["AlbumDetails"];
export type AlbumDisc = Schemas["AlbumDiscDetails"];
export type AlbumTrack = Schemas["AlbumTrackDetails"];
export type AlbumCredit =
	| Schemas["AlbumPartyCredit"]
	| Schemas["TrackPartyCredit"];
export type MatchedTrack = Schemas["AlbumListMatchedTrack"];
export type TrackAudio = Schemas["TrackAudioDetails"];
export type FileObject = Schemas["FileObjectDetails"];
export type ImageVariants = Schemas["ImageFileVariants"];
export type ListSortOption = Schemas["ListSortOption"];
export type Language = Schemas["LanguageListItem"];

export type PartyListItem = Schemas["PartyItems"];
export type PartyDetails = Schemas["PartyDetails"];
export type PartyType = Schemas["PartyType"];
export type PartyKind = Schemas["PartyKind"];
export type PartyGender = Schemas["PartyGender"];
export type CountryCode = Schemas["CountryCode"];
export type ExternalInfoLink = Schemas["PartyExternalInfoLink"];

export type PlaylistListItem = Schemas["PlaylistListItem"];
export type PlaylistDetails = Schemas["PlaylistDetails"];
export type PlaylistEntry = Schemas["PlaylistEntryDetails"];

export type SearchResult = Schemas["SearchResult"];
export type RadioTrack = Schemas["RadioTrack"];
export type RadioTrackRequest = Schemas["RadioTrackRequest"];
export type UserInfo = Schemas["UserInfo"];
export type LoginRequest = Schemas["LoginRequest"];
export type LoginResult = Schemas["LoginResult"];
