export async function handleGracefully<T>(
	fn: () => Promise<T>,
	errorMessage: string,
	suppressError: boolean = false,
	onError?: (e: Error) => void,
): Promise<T | undefined> {
	try {
		const result = await fn();
		return result as T;
	} catch (e) {
		console.warn(`${errorMessage}`, e);

		onError?.(e as Error);

		if (suppressError) {
			return Promise.resolve(undefined);
		}

		return Promise.reject(e);
	}
}
