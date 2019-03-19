import { Initable as InitableLike, Task as TaskLike } from "@zxteam/contract";
import { Task } from "ptask.js";

export abstract class Initable implements InitableLike {
	private _initialized?: boolean;
	private _initializingPromise?: TaskLike<void>;
	private _disposed?: boolean;
	private _disposingPromise?: TaskLike<void>;

	public get initialized(): boolean { return this._initialized === true; }
	public get initializing(): boolean { return this._initializingPromise !== undefined; }
	public get disposed(): boolean { return this._disposed === true; }
	public get disposing(): boolean { return this._disposingPromise !== undefined; }

	public init(): TaskLike<void> {
		this.verifyNotDisposed();
		if (!this._initialized) {
			if (!this._initializingPromise) {
				const onInitializeResult = this.onInit();
				if (typeof (onInitializeResult) === "object" && onInitializeResult instanceof Promise) {
					this._initializingPromise = Task.run(async () => {
						await onInitializeResult;
						this._initialized = true;
						delete this._initializingPromise;
					});
				} else {
					this._initialized = true;
					return Task.run(() => Promise.resolve());
				}
			}
			return this._initializingPromise;
		}
		return Task.run(() => Promise.resolve());
	}

	public dispose(): TaskLike<void> {
		if (!this._disposed) {
			if (!this._disposingPromise) {
				if (this._initializingPromise) {
					const initializingPromise = this._initializingPromise;
					this._disposingPromise = Task.run(async () => {
						await initializingPromise;
						const onDisposeResult = this.onDispose();
						if (typeof (onDisposeResult) === "object" && onDisposeResult instanceof Promise) {
							await onDisposeResult;
							this._disposed = true;
							delete this._disposingPromise;
						} else {
							this._disposed = true;
							return Promise.resolve();
						}
					});
				} else {
					const onDisposeResult = this.onDispose();
					if (typeof (onDisposeResult) === "object" && onDisposeResult instanceof Promise) {
						return this._disposingPromise = Task.run(async () => {
							await onDisposeResult;
							this._disposed = true;
							delete this._disposingPromise;
						});
					} else {
						this._disposed = true;
						return Task.run(() => Promise.resolve());
					}
				}
			}
			return this._disposingPromise;
		}
		return Task.run(() => Promise.resolve());
	}


	protected abstract onInit(): void | Promise<void> | TaskLike<void>;
	protected abstract onDispose(): void | Promise<void> | TaskLike<void>;


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
