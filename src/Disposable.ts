import * as zxteam from "@zxteam/contract";

export abstract class Disposable implements zxteam.Disposable {
	private _disposed?: boolean;
	private _disposingPromise?: Promise<void>;

	public get disposed(): boolean { return this._disposed === true; }
	public get disposing(): boolean { return this._disposingPromise !== undefined; }

	public dispose(): Promise<void> {
		if (!this._disposed) {
			if (this._disposingPromise === undefined) {
				const onDisposeResult = this.onDispose();
				if (onDisposeResult instanceof Promise) {
					this._disposingPromise = onDisposeResult.finally(() => {
						delete this._disposingPromise;
						this._disposed = true;
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
