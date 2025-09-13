import { watch } from "vue";
import { useMagicKeys, onKeyStroke } from "@vueuse/core";
import { useAudioPlayerStore } from "@/stores/audioPlayer";

export function usePlayerHotkeys() {
  const { space, arrowleft, arrowright } = useMagicKeys();

  const player = useAudioPlayerStore();
  const stop = watch(space, (pressed) => {
    if (pressed) {
      player.setPlaying();
    }
  });

  const next = watch(arrowright, (pressed) => {
    if (pressed) {
      player.next();
    }
  });

  const prev = watch(arrowleft, (pressed) => {
    if (pressed) {
      player.prev();
    }
  });

  const volUp = onKeyStroke(["ArrowUp"], () => {
    player.volume = Math.min(1, player.volume + 0.05);
  });

  const volDown = onKeyStroke(["ArrowDown"], () => {
    player.volume = Math.max(0, player.volume - 0.05);
  });

  return { stop, next, prev, volUp, volDown };
}
