export type SearchDTO = {
  artists: {
    artistID: string;
    name: string;
    imageUrl: string | null;
    albumCount: number;
  }[];
  albums: {
    albumID: string;
    title: string;
    artistName: string;
    artistID: string;
    imageUrl: string | null;
    trackCount: number;
  }[];
};
