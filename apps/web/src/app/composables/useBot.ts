export function useIsBot() {
  return useState("is-bot", () => false);
}
