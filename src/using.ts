import * as zxteam from "@zxteam/contract";

export namespace using {
	// tslint:disable-next-line: max-line-length
	export type ResourceInitializer<T> = ((cancellactonToken: zxteam.CancellationToken) => T | Promise<T>) | Promise<T>;
	export type Result<T> = T | Promise<T>;
}
export function using<TResource extends zxteam.Initable | zxteam.Disposable, TResult>(
	cancellactonToken: zxteam.CancellationToken,
	// tslint:disable-next-line: max-line-length
	disposable: using.ResourceInitializer<TResource>,
	worker: (cancellactonToken: zxteam.CancellationToken, disposable: TResource) => using.Result<TResult>
): Promise<TResult> {
	if (!disposable) { throw new Error("Wrong argument: disposable"); }
	if (!worker) { throw new Error("Wrong argument: worker"); }

	// tslint:disable-next-line: max-line-length
	async function workerExecutor(workerExecutorCancellactonToken: zxteam.CancellationToken, disposableResource: TResource): Promise<TResult> {
		if ("init" in disposableResource) {
			await (disposableResource as zxteam.Initable).init(cancellactonToken);
		}
		try {
			const workerResult = worker(workerExecutorCancellactonToken, disposableResource);
			if (workerResult instanceof Promise) {
				return await workerResult;
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
	function workerExecutorFacade(disposableObject: TResource | Promise<TResource>): Promise<TResult> {
		if (disposableObject instanceof Promise) {
			return (disposableObject as Promise<TResource>).then(disposableInstance => workerExecutor(cancellactonToken, disposableInstance));
		} else {
			return workerExecutor(cancellactonToken, disposableObject);
		}
	}

	if (typeof disposable === "function") {
		// tslint:disable-next-line: max-line-length
		const disposableInitializerFunction: using.ResourceInitializer<TResource> = disposable;
		const realDisposable = disposableInitializerFunction(cancellactonToken);
		return workerExecutorFacade(realDisposable);
	} else {
		return workerExecutorFacade(disposable);
	}
}
