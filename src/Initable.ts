import { Initable as InitableLike, Task } from "@zxteam/contract";
import { Task as TaskImpl } from "ptask.js";

export abstract class Initable implements InitableLike {
	private _initialized?: boolean;
	private _initializingPromise?: Task;
	private _disposed?: boolean;
	private _disposingPromise?: Task;

	public get initialized(): boolean { return this._initialized === true; }
	public get initializing(): boolean { return this._initializingPromise !== undefined; }
	public get disposed(): boolean { return this._disposed === true; }
	public get disposing(): boolean { return this._disposingPromise !== undefined; }

	public init(): Task {
		this.verifyNotDisposed();
		if (!this._initialized) {
			if (!this._initializingPromise) {
				const onInitializeResult = this.onInit();
				if (typeof (onInitializeResult) === "object" && onInitializeResult instanceof Promise) {
					this._initializingPromise = TaskImpl.run(async () => {
						await onInitializeResult;
						this._initialized = true;
						delete this._initializingPromise;
					});
				} else {
					this._initialized = true;
					return  TaskImpl.resolve();
				}
			}
			return this._initializingPromise;
		}
		return TaskImpl.resolve();
	}

	public dispose(): Task {
		if (!this._disposed) {
			if (!this._disposingPromise) {
				if (this._initializingPromise) {
					const initializingPromise = this._initializingPromise;
					this._disposingPromise = TaskImpl.run(async () => {
						await initializingPromise;
						const onDisposeResult = this.onDispose();
						if (typeof (onDisposeResult) === "object" && onDisposeResult instanceof Promise) {
							await onDisposeResult;
							this._disposed = true;
						}
						this._disposed = true;
						delete this._disposingPromise;
					});
				} else {
					const onDisposeResult = this.onDispose();
					if (typeof (onDisposeResult) === "object" && onDisposeResult instanceof Promise) {
						return this._disposingPromise = TaskImpl.run(async () => {
							await onDisposeResult;
							this._disposed = true;
							delete this._disposingPromise;
						});
					} else {
						this._disposed = true;
						return TaskImpl.resolve();
					}
				}
			}
			return this._disposingPromise;
		}
		return TaskImpl.resolve();
	}


	protected abstract onInit(): void | Promise<void> | Task;
	protected abstract onDispose(): void | Promise<void> | Task;


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
