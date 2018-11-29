import { DisposableLike } from "@zxteam/contract";

export abstract class Disposable implements DisposableLike {
	private _disposed?: boolean;
	private _disposingPromise?: Promise<void>;

	public get disposed(): boolean { return !!this._disposed; }
	public get disposing(): boolean { return !!this._disposingPromise; }

	public dispose(): Promise<void> {
		if (!this._disposed) {
			if (!this._disposingPromise) {
				const onDisposeResult = this.onDispose();
				if (typeof (onDisposeResult) === "object" && onDisposeResult instanceof Promise) {
					this._disposingPromise = onDisposeResult.then(() => {
						this._disposed = true;
						delete this._disposingPromise;
					});
				} else {
					this._disposed = true;
					return Promise.resolve();
				}
			}
			return this._disposingPromise;
		}
		return Promise.resolve();
	}

	protected abstract onDispose(): void | Promise<void>;

	protected verifyDestroy() {
		if (this.disposed || this.disposing) {
			throw new Error("Wrong operation on disposed object");
		}
	}
}

export function using<TDisposable extends DisposableLike, TResult>(
	disposable: (() => TDisposable) | Promise<TDisposable>,
	worker: (disposable: TDisposable) => TResult | Promise<TResult>
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
					"Dispose method raised an error." +
					+ "This is unexpected behavoir due dispose() should be exception safe.",
					e);
			}
		}
	}

	if (disposable instanceof Promise) {
		return disposable.then(function (realDisposable) {
			return workerExecutor(realDisposable);
		});
	} else {
		return workerExecutor(disposable());
	}
}
