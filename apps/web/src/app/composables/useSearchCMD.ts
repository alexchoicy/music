export function useSearchCMD() {
  const state = useState("use-searchCMD", () => false);

  const toggle = () => (state.value = !state.value);

  return { state, toggle };
}
