import { watch, computed } from "vue";
import { useMagicKeys, onKeyStroke, useActiveElement } from "@vueuse/core";

export function usePlayerHotkeys() {
  const player = useAudioPlayer();

  const activeEl = useActiveElement();

  const isFormFocused = computed(() => {
    const t = activeEl.value as HTMLElement | null;
    return t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable;
  });

  const { ctrl_arrowleft, ctrl_arrowright, space } = useMagicKeys({
    passive: false,
  });

  const stopSpace = watch(space!, (pressed) => pressed && !isFormFocused.value && player.togglePlay());
  const stopPrev = watch(ctrl_arrowleft!, (p) => p && !isFormFocused.value && player.manualPrevious());
  const stopNext = watch(ctrl_arrowright!, (p) => p && !isFormFocused.value && player.manualNext());

  const stopVolUp = onKeyStroke("ArrowUp", (e) => {
    if (isFormFocused.value) return;
    e.preventDefault();
    player.setVolume(Math.min(1, player.volume + 0.05));
  });
  const stopVolDown = onKeyStroke("ArrowDown", (e) => {
    if (isFormFocused.value) return;
    e.preventDefault();
    player.setVolume(Math.max(0, player.volume - 0.05));
  });

  return { stopSpace, stopPrev, stopNext, stopVolUp, stopVolDown };
}
