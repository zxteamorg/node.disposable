import * as zxteam from "@zxteam/contract";
import { Task } from "@zxteam/task";

export abstract class Initable implements zxteam.Initable {
	private _initialized?: boolean;
	private _initializingTask?: zxteam.Task<this>;
	private _disposed?: boolean;
	private _disposingTask?: zxteam.Task;

	public get initialized(): boolean { return this._initialized === true; }
	public get initializing(): boolean { return this._initializingTask !== undefined; }
	public get disposed(): boolean { return this._disposed === true; }
	public get disposing(): boolean { return this._disposingTask !== undefined; }

	public init(): zxteam.Task<this> {
		this.verifyNotDisposed();
		if (!this._initialized) {
			if (!this._initializingTask) {
				const onInitializeResult = this.onInit();
				if (typeof (onInitializeResult) === "object") {
					if (onInitializeResult instanceof Promise) {
						this._initializingTask = Task.run(async () => {
							await onInitializeResult;
							delete this._initializingTask;
							this._initialized = true;
							return this;
						});
					} else {
						this._initializingTask = onInitializeResult.continue(() => {
							delete this._initializingTask;
							this._initialized = true;
							return this;
						});
					}
				} else {
					this._initialized = true;
					return Task.resolve(this);
				}
			}
			return this._initializingTask;
		}
		return Task.resolve(this);
	}

	public dispose(): zxteam.Task {
		if (!this._disposed) {
			if (!this._disposingTask) {
				if (this._initializingTask) {
					const initializingTask = this._initializingTask;
					this._disposingTask = Task.run(async () => {
						await initializingTask;
						const onDisposeResult = this.onDispose();
						if (typeof (onDisposeResult) === "object") {
							if (onDisposeResult instanceof Promise) {
								this._disposingTask = Task.run(async () => {
									await onDisposeResult;
									delete this._disposingTask;
									this._disposed = true;
								});
							} else {
								this._disposingTask = onDisposeResult.continue(() => {
									delete this._disposingTask;
									this._disposed = true;
								});
							}
							await this._disposingTask;
						}
						this._disposed = true;
						delete this._disposingTask;
					});
				} else {
					const onDisposeResult = this.onDispose();
					if (typeof (onDisposeResult) === "object") {
						if (onDisposeResult instanceof Promise) {
							this._disposingTask = Task.run(async () => {
								await onDisposeResult;
								this._disposed = true;
								delete this._disposingTask;
							});
						} else {
							this._disposingTask = onDisposeResult.continue(() => {
								delete this._disposingTask;
								this._disposed = true;
							});
						}
					} else {
						this._disposed = true;
						return Task.resolve();
					}
				}
			}
			return this._disposingTask;
		}
		return Task.resolve();
	}


	protected abstract onInit(): void | Promise<void> | zxteam.Task<void>;
	protected abstract onDispose(): void | Promise<void> | zxteam.Task;


	protected verifyInitialized() {
		if (!this.initialized) {
			throw new Error("Wrong operation on non-initialized object");
		}
	}

	protected verifyNotDisposed() {
		if (this.disposed || this.disposing) {
			throw new Error("Wrong operation on disposed object");
		}
	}

	protected verifyInitializedAndNotDisposed() {
		this.verifyInitialized();
		this.verifyNotDisposed();
	}
}
