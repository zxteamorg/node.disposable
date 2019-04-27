import { Disposable, Initable, Task, CancellationToken } from "@zxteam/contract";
import { Task as TaskImpl } from "ptask.js";

export namespace using {
	export type ResourceInitializer<T> = ((cancellactonToken: CancellationToken) => T | Promise<T> | Task<T>) | Promise<T> | Task<T>;
	export type Result<T> = T | Promise<T> | Task<T>;
}
export function using<TResource extends Initable | Disposable, TResult>(
	cancellactonToken: CancellationToken,
	// tslint:disable-next-line: max-line-length
	disposable: using.ResourceInitializer<TResource>,
	worker: (disposable: TResource, cancellactonToken: CancellationToken) => using.Result<TResult>
): Task<TResult> {
	if (!disposable) { throw new Error("Wrong argument: disposable"); }
	if (!worker) { throw new Error("Wrong argument: worker"); }

	return TaskImpl.run(async (ct) => {
		// tslint:disable-next-line: max-line-length
		async function workerExecutor(disposableResource: TResource, workerExecutorCancellactonToken: CancellationToken): Promise<TResult> {
			if ("init" in disposableResource) {
				await (disposableResource as Initable).init();
			}
			try {
				return await worker(disposableResource, workerExecutorCancellactonToken);
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
		function workerExecutorFacade(disposableObject: TResource | Promise<TResource> | Task<TResource>): Promise<TResult> {
			if (disposableObject instanceof Promise) {
				return (disposableObject as Promise<TResource>).then(disposableInstance => workerExecutor(disposableInstance, ct));
			} else {
				return workerExecutor(disposableObject, ct);
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
