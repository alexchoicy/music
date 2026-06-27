import { Volume1Icon, Volume2Icon, VolumeXIcon } from "lucide-react";

import { Button } from "#/components/coss/button";
import {
	Popover,
	PopoverPopup,
	PopoverTrigger,
} from "#/components/coss/popover";
import { Slider } from "#/components/coss/slider";

export function VolumeIcon({
	muted,
	volume,
	...props
}: {
	muted: boolean;
	volume: number;
} & React.ComponentProps<typeof Volume2Icon>) {
	if (muted || volume === 0) {
		return <VolumeXIcon {...props} />;
	}

	if (volume < 0.5) {
		return <Volume1Icon {...props} />;
	}

	return <Volume2Icon {...props} />;
}

type VolumeControlProps = {
	muted: boolean;
	volume: number;
	setVolume: (volume: number) => void;
	toggleMute: () => void;
	buttonClassName?: string;
};

export function VolumeControl({
	muted,
	volume,
	setVolume,
	toggleMute,
	buttonClassName,
}: VolumeControlProps) {
	return (
		<Popover
			onOpenChange={(_, details) => {
				if (details.reason === "trigger-press") details.cancel();
			}}
		>
			<PopoverTrigger
				closeDelay={150}
				delay={0}
				openOnHover
				render={
					<Button
						aria-label={muted ? "Unmute" : "Mute"}
						className={buttonClassName}
						onClick={(event) => {
							event.preventDefault();
							toggleMute();
						}}
						size="icon-sm"
						variant="ghost"
					/>
				}
			>
				<VolumeIcon muted={muted} volume={volume} />
			</PopoverTrigger>
			<PopoverPopup
				align="center"
				className="w-auto"
				side="top"
				sideOffset={8}
				tooltipStyle
			>
				<Slider
					aria-label="Volume level"
					className="h-20 [&_[data-slot=slider-control]]:min-h-20"
					max={1}
					min={0}
					onValueChange={(nextValue) => {
						if (typeof nextValue === "number") {
							setVolume(nextValue);
						}
					}}
					orientation="vertical"
					step={0.01}
					value={muted ? 0 : volume}
				/>
			</PopoverPopup>
		</Popover>
	);
}
