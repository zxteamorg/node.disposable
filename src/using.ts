import { DisposableLike, TaskLike } from "@zxteam/contract";

export function using<TDisposable extends DisposableLike, TResult>(
	disposable: (() => TDisposable) | Promise<TDisposable> | TaskLike<TDisposable>,
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

	if (typeof disposable === "function") {
		const friendlyDisposable: () => TDisposable = disposable;
		return workerExecutor(friendlyDisposable());
	} else if (disposable instanceof Promise) {
		const friendlyDisposable: Promise<TDisposable> = disposable;
		return friendlyDisposable.then(function (realDisposable) {
			return workerExecutor(realDisposable);
		});
	} else {
		const friendlyDisposable: TaskLike<TDisposable> = disposable;
		return (async () => workerExecutor(await friendlyDisposable))();
	}
}
