import { DisposableLike, TaskLike } from "@zxteam/contract";

export function using<TDisposable extends DisposableLike, TResult>(
	disposable: (() => TDisposable) | Promise<TDisposable>,
	worker: (disposable: TDisposable) => TResult | Promise<TResult> | TaskLike<TResult>
): Promise<TResult> {
	if (!disposable) { throw new Error("Wrong argument: disposable"); }
	if (!worker) { throw new Error("Wrong argument: worker"); }

	async function workerExecutor(disposableObject: TDisposable): Promise<TResult> {
		try {
			return await worker(disposableObject);
		} finally {
			try {
				await disposableObject.dispose();
			} catch (e) {
				console.error(
					"Dispose method raised an error. This is unexpected behavoir due dispose() should be exception safe.",
					e);
			}
		}
	}

	if (("then" in disposable && typeof disposable.then === "function") || disposable instanceof Promise) {
		return disposable.then(function (realDisposable) {
			return workerExecutor(realDisposable);
		});
	} else {
		return workerExecutor(disposable());
	}
}
