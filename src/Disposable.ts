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

	protected verifyNotDisposed() {
		if (this.disposed || this.disposing) {
			throw new Error("Wrong operation on disposed object");
		}
	}
}
