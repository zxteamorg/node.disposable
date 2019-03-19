import { Disposable, Task, CancellationToken } from "@zxteam/contract";
import { Task as TaskImpl } from "ptask.js";

export function using<TDisposable extends Disposable, TResult>(
	disposable: ((cancellactonToken: CancellationToken) => TDisposable) | Promise<TDisposable> | Task<TDisposable>,
	worker: (disposable: TDisposable, cancellactonToken: CancellationToken) => TResult | Promise<TResult> | Task<TResult>,
	cancellactonToken?: CancellationToken
): Task<TResult> {
	if (!disposable) { throw new Error("Wrong argument: disposable"); }
	if (!worker) { throw new Error("Wrong argument: worker"); }

	return TaskImpl.run(async (ct) => {
		async function workerExecutor(disposableObject: TDisposable, workerExecutorCancellactonToken: CancellationToken): Promise<TResult> {
			try {
				return await worker(disposableObject, workerExecutorCancellactonToken);
			} finally {
				try {
					await disposableObject.dispose();
				} catch (e) {
					console.error(
						"Dispose method raised an error. This is unexpected behaviour due dispose() should be exception safe.",
						e);
				}
			}
		}

		if (typeof disposable === "function") {
			const friendlyDisposable: (myCt: CancellationToken) => TDisposable = disposable;
			return workerExecutor(friendlyDisposable(ct), ct);
		} else if (disposable instanceof Promise) {
			const friendlyDisposable: Promise<TDisposable> = disposable;
			const realDisposable = await friendlyDisposable;
			return workerExecutor(realDisposable, ct);
		} else {
			const friendlyDisposable: Task<TDisposable> = disposable;
			const realDisposable = await friendlyDisposable;
			return workerExecutor(realDisposable, ct);
		}
	}, cancellactonToken);

}
