import * as zxteam from "@zxteam/contract";

export function safeDispose(disposable: any): Promise<void> {
	if (typeof disposable !== "object") { return Promise.resolve(); }
	if (!("dispose" in disposable)) { return Promise.resolve(); }
	if (typeof disposable.dispose !== "function") { return Promise.resolve(); }

	return Promise.resolve().then(async () => {
		try {
			const disposeResult = (disposable as zxteam.Disposable).dispose();
			if (disposeResult instanceof Promise) {
				await disposeResult;
			}
		} catch (e) {
			console.error(
				"Dispose method raised an error. This is unexpected behaviour due dispose() should be exception safe. The error was bypassed.",
				e);
		}
	});
}
