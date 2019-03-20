import { Disposable as DisposableLike, Task } from "@zxteam/contract";
import { Task as TaskImpl } from "ptask.js";

export abstract class Disposable implements DisposableLike {
	private _disposed?: boolean;
	private _disposingPromise?: Task;

	public get disposed(): boolean { return this._disposed === true; }
	public get disposing(): boolean { return this._disposingPromise !== undefined; }

	public dispose(): Task {
		if (!this._disposed) {
			if (this._disposingPromise === undefined) {
				const onDisposeResult = this.onDispose();
				if (typeof (onDisposeResult) === "object" && onDisposeResult instanceof Promise) {
					this._disposingPromise = TaskImpl.run(async () => {
						await onDisposeResult;
						this._disposed = true;
						delete this._disposingPromise;
					});
				} else {
					this._disposed = true;
					return TaskImpl.run(() => Promise.resolve());
				}
			}
			return this._disposingPromise;
		}
		return TaskImpl.run(() => Promise.resolve());
	}

	protected abstract onDispose(): void | Promise<void> | Task;

	protected verifyNotDisposed() {
		if (this.disposed || this.disposing) {
			throw new Error("Wrong operation on disposed object");
		}
	}
}
