import { watch } from "vue";
import { useMagicKeys, onKeyStroke } from "@vueuse/core";
import { useAudioPlayer } from "@/stores/audioPlayer";

export function usePlayerHotkeys() {
  const player = useAudioPlayer();

  const { ctrl_arrowleft, ctrl_arrowright, space } = useMagicKeys({
    passive: false,
    onEventFired: (e) => {
      const allowedCodes = new Set([
        "Space",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
      ]);
      if (!allowedCodes.has(e.code)) return;

      const target = e.target as HTMLElement | null;
      const isFormElement =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (!isFormElement) {
        e.preventDefault();
      }
    },
  });

  const stop = watch(space!, (pressed) => {
    if (pressed) {
      player.togglePlay();
    }
  });

  const prev = watch(ctrl_arrowleft!, (pressed) => {
    if (pressed) {
      player.manualPrevious();
    }
  });

  const next = watch(ctrl_arrowright!, (pressed) => {
    if (pressed) {
      player.manualNext();
    }
  });

  const volUp = onKeyStroke(["ArrowUp"], (e) => {
    e.preventDefault();
    player.setVolume(Math.min(1, player.volume + 0.05));
  });

  const volDown = onKeyStroke(["ArrowDown"], (e) => {
    e.preventDefault();
    player.setVolume(Math.max(0, player.volume - 0.05));
  });

  return { stop, next, prev, volUp, volDown };
}
