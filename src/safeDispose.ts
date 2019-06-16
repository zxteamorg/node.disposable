import * as zxteam from "@zxteam/contract";
import { Task } from "@zxteam/task";

export function safeDispose(disposable: any): zxteam.Task {
	if (typeof disposable !== "object") { return Task.resolve(); }
	if (!("dispose" in disposable)) { return Task.resolve(); }
	if (typeof disposable.dispose !== "function") { return Task.resolve(); }

	return Task.run(async () => {
		try {
			const disposeResult = disposable.dispose();
			if ("promise" in disposeResult) {
				if (disposeResult.promise instanceof Promise) {
					await disposeResult.promise;
				}
			}
		} catch (e) {
			console.error(
				"Dispose method raised an error. This is unexpected behaviour due dispose() should be exception safe. The error was bypassed.",
				e);
		}
	});
}
