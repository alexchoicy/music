export default defineNuxtPlugin(() => {
  const audioPlayer = useAudioPlayer();
  audioPlayer.setup();
});
