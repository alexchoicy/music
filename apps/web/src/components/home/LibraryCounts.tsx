import { Link } from "@tanstack/react-router";
import { Disc3Icon, MicVocalIcon, UsersRoundIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/coss/card";
import type { components } from "#/data/APIschema";

export function LibraryCounts({
	overview,
}: {
	overview: components["schemas"]["HomeOverview"];
}) {
	return (
		<section
			aria-label="Library counts"
			className="grid grid-cols-3 gap-2 sm:gap-4"
		>
			<CounterCard
				count={overview.albumCount}
				icon={<Disc3Icon aria-hidden="true" />}
				label="Albums"
				to="/albums"
			/>
			<CounterCard
				count={overview.artistCount}
				icon={<UsersRoundIcon aria-hidden="true" />}
				label="Parties"
				to="/parties"
			/>
			<CounterCard
				count={overview.concertCount}
				icon={<MicVocalIcon aria-hidden="true" />}
				label="Concerts"
				to="/concerts"
			/>
		</section>
	);
}

type CounterCardProps = {
	count: number | string;
	icon: ReactNode;
	label: string;
	to: "/albums" | "/concerts" | "/parties";
};

function CounterCard({ count, icon, label, to }: CounterCardProps) {
	return (
		<Link
			className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
			to={to}
		>
			<Card className="h-full transition-shadow hover:shadow-md">
				<CardHeader className="grid-cols-[1fr_auto]" size="sm">
					<div className="flex flex-col gap-2">
						<CardDescription>{label}</CardDescription>
						<CardTitle size="metric">{count}</CardTitle>
					</div>
					<div className="hidden size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground sm:flex [&_svg]:size-6">
						{icon}
					</div>
				</CardHeader>
			</Card>
		</Link>
	);
}
