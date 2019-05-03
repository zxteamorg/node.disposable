import * as zxteam from "@zxteam/contract";
import { Task } from "@zxteam/task";

export namespace using {
	// tslint:disable-next-line: max-line-length
	export type ResourceInitializer<T> = ((cancellactonToken: zxteam.CancellationToken) => T | Promise<T> | zxteam.Task<T>) | Promise<T> | zxteam.Task<T>;
	export type Result<T> = T | Promise<T> | zxteam.Task<T>;
}
export function using<TResource extends zxteam.Initable | zxteam.Disposable, TResult>(
	cancellactonToken: zxteam.CancellationToken,
	// tslint:disable-next-line: max-line-length
	disposable: using.ResourceInitializer<TResource>,
	worker: (cancellactonToken: zxteam.CancellationToken, disposable: TResource) => using.Result<TResult>
): zxteam.Task<TResult> {
	if (!disposable) { throw new Error("Wrong argument: disposable"); }
	if (!worker) { throw new Error("Wrong argument: worker"); }

	return Task.run(async (ct) => {
		// tslint:disable-next-line: max-line-length
		async function workerExecutor(workerExecutorCancellactonToken: zxteam.CancellationToken, disposableResource: TResource): Promise<TResult> {
			if ("init" in disposableResource) {
				await (disposableResource as zxteam.Initable).init();
			}
			try {
				const workerResult = worker(workerExecutorCancellactonToken, disposableResource);
				if (workerResult instanceof Promise) {
					return workerResult;
				} if (typeof workerResult === "object" && "promise" in workerResult) {
					return workerResult.promise;
				} else {
					return workerResult;
				}
			} finally {
				try {
					await disposableResource.dispose();
				} catch (e) {
					console.error(
						"Dispose method raised an error. This is unexpected behaviour due dispose() should be exception safe. The error was bypassed.",
						e);
				}
			}
		}

		// tslint:disable-next-line: max-line-length
		function workerExecutorFacade(disposableObject: TResource | Promise<TResource> | zxteam.Task<TResource>): Promise<TResult> {
			if (disposableObject instanceof Promise) {
				return (disposableObject as Promise<TResource>).then(disposableInstance => workerExecutor(ct, disposableInstance));
			} else if (typeof disposableObject === "object" && "promise" in disposableObject) {
				return disposableObject.promise.then(disposableInstance => workerExecutor(ct, disposableInstance));
			} else {
				return workerExecutor(ct, disposableObject);
			}
		}

		if (typeof disposable === "function") {
			// tslint:disable-next-line: max-line-length
			const disposableInitializerFunction: using.ResourceInitializer<TResource> = disposable;
			const realDisposable = disposableInitializerFunction(ct);
			return workerExecutorFacade(realDisposable);
		} else {
			return workerExecutorFacade(disposable);
		}
	}, cancellactonToken);

}
