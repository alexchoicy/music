import { Link } from "@tanstack/react-router";
import { Album, Search, Settings, Upload, User } from "lucide-react";
import { AppMusicIcon } from "../icon";
import { Button } from "../shadcn/button";
import { Kbd, KbdGroup } from "../shadcn/kbd";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "../shadcn/sidebar";

export function AppSidebar() {
	return (
		<Sidebar>
			<SidebarHeader>
				<Link
					to="/"
					className="text-2xl font-bold items-center flex justify-center"
				>
					<AppMusicIcon className="w-8 h-8 mr-2" />
					Music
				</Link>
				<Button className="w-full justify-between" variant="outline">
					<Search className="w-5 h-5 mr-2" />
					<div>Search</div>
					<KbdGroup>
						<Kbd>Ctrl</Kbd>
						<Kbd>K</Kbd>
					</KbdGroup>
				</Button>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Find Music</SidebarGroupLabel>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton
								render={
									<Link to="/albums">
										<Album />
										Albums
									</Link>
								}
							></SidebarMenuButton>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<SidebarMenuButton
								render={
									<Link to="/">
										<User />
										Parties
									</Link>
								}
							></SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarGroup>
				<SidebarGroup className="mt-auto">
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									render={
										<Link
											to="/create"
											className="w-full flex justify-center items-center gap-2"
										>
											<Upload />
											<span>Create</span>
										</Link>
									}
								></SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							render={
								<Link to="/">
									<Settings />
									Settings
								</Link>
							}
						></SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
