import { createContext, useContext } from "react";

const ApiEndpointContext = createContext<string | null>(null);

type ApiEndpointProviderProps = {
	apiEndpoint: string;
	children: React.ReactNode;
};

export function ApiEndpointProvider({
	apiEndpoint,
	children,
}: ApiEndpointProviderProps) {
	return (
		<ApiEndpointContext.Provider value={apiEndpoint}>
			{children}
		</ApiEndpointContext.Provider>
	);
}

export function useApiEndpoint() {
	const apiEndpoint = useContext(ApiEndpointContext);

	if (!apiEndpoint) {
		throw new Error("useApiEndpoint must be used within ApiEndpointProvider");
	}

	return apiEndpoint;
}
