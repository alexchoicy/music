import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { withUniwind } from "uniwind";

const StyledSymbolView = withUniwind(SymbolView);

export type IconName = ComponentProps<typeof SymbolView>["name"];

type IconProps = {
	name: IconName;
	size?: number;
	className?: string;
};

export function Icon({ name, size = 24, className }: IconProps) {
	return (
		<StyledSymbolView
			name={name}
			size={size}
			tintColorClassName={className ?? "accent-foreground"}
		/>
	);
}
