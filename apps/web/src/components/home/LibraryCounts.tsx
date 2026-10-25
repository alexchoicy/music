import type * as API from "@music/api";
import { Link } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";

type LibraryStats = API.LibraryStats;

const numberFormatter = new Intl.NumberFormat();

export function LibraryCounts({ stats }: { stats: LibraryStats }) {
	const counts = [
		{ label: "Albums", count: stats.albumCount, to: "/albums" },
		{ label: "Parties", count: stats.artistCount, to: "/parties" },
		{ label: "Concerts", count: stats.concertCount, to: "/concerts" },
	] as const;

	return (
		<section
			aria-label="Library counts"
			className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))]"
		>
			{counts.map((item) => (
				<Link
					className="flex items-center justify-between gap-4 rounded-lg px-5 py-4 transition-colors duration-150 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none"
					key={item.to}
					to={item.to}
				>
					<span className="flex flex-col gap-0.5">
						<span className="text-xs text-muted-foreground">{item.label}</span>
						<span className="text-3xl font-semibold tracking-tight tabular-nums">
							{numberFormatter.format(Number(item.count))}
						</span>
					</span>
					<ChevronRightIcon
						aria-hidden="true"
						className="size-5 text-muted-foreground"
					/>
				</Link>
			))}
		</section>
	);
}
