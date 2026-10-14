export function PageHeader({
	eyebrow = "Library",
	title,
}: {
	eyebrow?: string;
	title: string;
}) {
	return (
		<header className="flex flex-col gap-1">
			<p className="text-xs text-muted-foreground">{eyebrow}</p>
			<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
		</header>
	);
}
