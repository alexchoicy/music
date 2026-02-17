import type React from "react";
import { AppHeader } from "./appHeader";
import { AudioPlayer } from "./audioPlayer";

type AppLayoutProps = {
  header?: React.ReactNode;
  children: React.ReactNode;
};

export function AppLayout({ header, children }: AppLayoutProps) {
  return (
    <div className="grid h-screen w-full grid-rows-[auto_1fr_auto]">
      <AppHeader>{header}</AppHeader>
      <main className="min-h-0 overflow-y-auto p-6">{children}</main>
      <AudioPlayer />
    </div>
  );
}
