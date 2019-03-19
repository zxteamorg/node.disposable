import { Disposable as DisposableLike, Task as TaskLike } from "@zxteam/contract";
import { Task } from "ptask.js";

export abstract class Disposable implements DisposableLike {
	private _disposed?: boolean;
	private _disposingPromise?: TaskLike<void>;

	public get disposed(): boolean { return this._disposed === true; }
	public get disposing(): boolean { return this._disposingPromise !== undefined; }

	public dispose(): TaskLike<void> {
		if (!this._disposed) {
			if (this._disposingPromise === undefined) {
				const onDisposeResult = this.onDispose();
				if (typeof (onDisposeResult) === "object" && onDisposeResult instanceof Promise) {
					this._disposingPromise = Task.run(async () => {
						await onDisposeResult;
						this._disposed = true;
						delete this._disposingPromise;
					});
				} else {
					this._disposed = true;
					return Task.run(() => Promise.resolve());
				}
			}
			return this._disposingPromise;
		}
		return Task.run(() => Promise.resolve());
	}

	protected abstract onDispose(): void | Promise<void> | TaskLike<void>;

	protected verifyNotDisposed() {
		if (this.disposed || this.disposing) {
			throw new Error("Wrong operation on disposed object");
		}
	}
}
