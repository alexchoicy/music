import * as Network from "expo-network";

let isUnmetered = false;
let hasEvent = false;
const listeners = new Set<(isWifi: boolean) => void>();

function update(state: Network.NetworkState) {
	const next =
		!!state.isConnected &&
		(state.type === Network.NetworkStateType.WIFI ||
			state.type === Network.NetworkStateType.ETHERNET);
	if (next === isUnmetered) return;
	isUnmetered = next;
	for (const listener of listeners) listener(next);
}

// The listener only reports changes, so read the state the app starts with,
// unless a newer change already arrived.
void Network.getNetworkStateAsync().then((state) => {
	if (!hasEvent) update(state);
});
Network.addNetworkStateListener((state) => {
	hasEvent = true;
	update(state);
});

/** Wi‑Fi or Ethernet, where originals and downloads use no mobile data. */
export function isOnWifi() {
	return isUnmetered;
}

/** Calls the listener when the phone joins or leaves Wi‑Fi. */
export function onWifiChange(listener: (isWifi: boolean) => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
