import { Disposable, Initable, Task, CancellationToken } from "@zxteam/contract";
import { Task as TaskImpl } from "ptask.js";

export function using<TDisposable extends Disposable, TInitable extends Initable, TResult>(
	// tslint:disable-next-line: max-line-length
	disposable: ((cancellactonToken: CancellationToken) => TInitable | TDisposable | Promise<TInitable | TDisposable> | Task<TInitable | TDisposable>) | Promise<TInitable | TDisposable> | Task<TInitable | TDisposable>,
	worker: (disposable: TInitable | TDisposable, cancellactonToken: CancellationToken) => TResult | Promise<TResult> | Task<TResult>,
	cancellactonToken?: CancellationToken
): Task<TResult> {
	if (!disposable) { throw new Error("Wrong argument: disposable"); }
	if (!worker) { throw new Error("Wrong argument: worker"); }

	return TaskImpl.run(async (ct) => {
		// tslint:disable-next-line: max-line-length
		async function workerExecutor(disposableObject: TInitable | TDisposable, workerExecutorCancellactonToken: CancellationToken): Promise<TResult> {
			if ("init" in disposableObject) {
				await disposableObject.init();
			}
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

		// tslint:disable-next-line: max-line-length
		function workerExecutorFacade(disposableObject: TInitable | TDisposable | Promise<TInitable | TDisposable> | Task<TInitable | TDisposable>): Promise<TResult> {
			if (disposableObject instanceof Promise) {
				return (disposableObject as Promise<TDisposable>).then(disposableInstance => workerExecutor(disposableInstance, ct));
			} else {
				return workerExecutor(disposableObject, ct);
			}
		}

		if (typeof disposable === "function") {
			// tslint:disable-next-line: max-line-length
			const disposableInitializerFunction: (myCt: CancellationToken) => TInitable | TDisposable | Promise<TInitable | TDisposable> | Task<TInitable | TDisposable> = disposable;
			const realDisposable = disposableInitializerFunction(ct);
			return workerExecutorFacade(realDisposable);
		} else {
			return workerExecutorFacade(disposable);
		}
	}, cancellactonToken);

}
