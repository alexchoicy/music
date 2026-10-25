import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import type React from "react";

import { cn } from "@/lib/utils/styles";

export function Avatar({
	className,
	size = "default",
	...props
}: AvatarPrimitive.Root.Props & {
	size?: "default" | "md" | "portrait" | "portrait-lg" | "hero";
}): React.ReactElement {
	return (
		<AvatarPrimitive.Root
			className={cn(
				"relative isolate inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background align-middle text-xs font-medium select-none",
				size === "md" && "size-10 font-semibold",
				size === "portrait" && "artwork-edge size-26 text-2xl font-semibold shadow-card",
				size === "portrait-lg" &&
					"artwork-edge size-28 text-[32px] font-semibold shadow-card",
				size === "hero" &&
					"artwork-edge size-28 text-4xl font-semibold shadow-pop sm:size-44 sm:text-5xl",
				className,
			)}
			data-slot="avatar"
			{...props}
		/>
	);
}

export function AvatarImage({
	className,
	...props
}: AvatarPrimitive.Image.Props): React.ReactElement {
	return (
		<AvatarPrimitive.Image
			className={cn(
				"absolute inset-0 z-10 size-full object-cover data-error:invisible data-loading:invisible",
				className,
			)}
			data-slot="avatar-image"
			{...props}
		/>
	);
}

export function AvatarFallback({
	className,
	...props
}: AvatarPrimitive.Fallback.Props): React.ReactElement {
	return (
		<AvatarPrimitive.Fallback
			className={cn(
				"absolute inset-0 flex size-full items-center justify-center rounded-full bg-muted",
				className,
			)}
			data-slot="avatar-fallback"
			{...props}
		/>
	);
}

export { AvatarPrimitive };
