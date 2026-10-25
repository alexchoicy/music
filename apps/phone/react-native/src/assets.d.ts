// Metro resolves image imports to an asset id.
declare module "*.svg" {
	const asset: number;
	export default asset;
}
