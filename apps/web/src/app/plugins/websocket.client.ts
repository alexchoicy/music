import { useWebSocket } from "@vueuse/core";
import { toast } from "vue-sonner";
import { WSMusicMessageClientPayloadSchema } from "@music/api/type/ws";
export default defineNuxtPlugin(() => {
  const wsBaseUrl = useRuntimeConfig().public.WS_URL;
  const url = wsBaseUrl + "/events";
  const blockByAuth = useState("blockByAuth", () => true);

  const ws = useWebSocket(url, {
    autoReconnect: {
      retries: blockByAuth.value ? 0 : 5,
      delay: 5000,
      onFailed: () => {
        if (blockByAuth.value) return;
        toast.error("WebSocket connection failed. Please refresh the page.");
      },
    },
    onConnected() {
      console.log("WebSocket connected");
      blockByAuth.value = false;
    },
    onError(ws, event) {
      console.error("WebSocket error", event);
    },
    onDisconnected(ws, event) {
      if (event.code === 4401 || event.code === 4003) {
        console.log("WebSocket disconnected becuase auth");
        blockByAuth.value = true;
        return;
      }
      console.log("WebSocket disconnected", event);
    },
    onMessage(ws, event) {
      const message = JSON.parse(event.data);

      if (message.type === "music") {
        const payload = WSMusicMessageClientPayloadSchema.safeParse(message.payload);
        if (!payload.success) {
          console.error("Invalid music message payload", payload.error);
          return;
        }
        if (payload.data.action === "init") {
          const audioPlayer = useAudioPlayer();
          audioPlayer.updateWs();
        }
      }
    },
  });

  return {
    provide: {
      ws,
    },
  };
});
