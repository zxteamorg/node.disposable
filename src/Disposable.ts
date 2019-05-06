import * as zxteam from "@zxteam/contract";
import { Task } from "@zxteam/task";

export abstract class Disposable implements zxteam.Disposable {
	private _disposed?: boolean;
	private _disposingTask?: zxteam.Task;

	public get disposed(): boolean { return this._disposed === true; }
	public get disposing(): boolean { return this._disposingTask !== undefined; }

	public dispose(): zxteam.Task {
		if (!this._disposed) {
			if (this._disposingTask === undefined) {
				const onDisposeResult = this.onDispose();
				if (typeof (onDisposeResult) === "object") {
					if (onDisposeResult instanceof Promise) {
						this._disposingTask = Task.run(async () => {
							try {
								await onDisposeResult;
							} finally {
								delete this._disposingTask;
							}
							this._disposed = true;
						});
					} else {
						this._disposingTask = onDisposeResult.continue((prevTask) => {
							delete this._disposingTask;
							if (prevTask.isSuccessed === false) { throw prevTask.error; }
							this._disposed = true;
						});
					}
				} else {
					this._disposed = true;
					return Task.resolve();
				}
			}
			return this._disposingTask;
		}
		return Task.resolve();
	}

	protected abstract onDispose(): void | Promise<void> | zxteam.Task;

	protected verifyNotDisposed() {
		if (this.disposed || this.disposing) {
			throw new Error("Wrong operation on disposed object");
		}
	}
}
