import { Disposable as IDisposable } from "@zxteam/contract";

import { safeDispose } from "./safeDispose";

export abstract class Disposable implements IDisposable {
	private _disposed?: boolean;
	private _disposingPromise?: Promise<void>;

	public get disposed(): boolean { return this._disposed === true; }
	public get disposing(): boolean { return this._disposingPromise !== undefined; }

	public dispose(): Promise<void> {
		if (this._disposed !== true) {
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

	public static async disposeAll(...instances: ReadonlyArray<IDisposable>): Promise<void> {
		for (const instance of instances) {
			await safeDispose(instance);
		}
	}

	protected abstract onDispose(): void | Promise<void>;

	protected verifyNotDisposed() {
		if (this.disposed || this.disposing) {
			throw new Error("Wrong operation on disposed object");
		}
	}
}
