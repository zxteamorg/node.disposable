import { InitableLike } from "@zxteam/contract";

import { Disposable } from "./Disposable";

export abstract class Initable implements InitableLike {
	private _initialized?: boolean;
	private _initializingPromise?: Promise<void>;
	private _disposed?: boolean;
	private _disposingPromise?: Promise<void>;

	public get initialized(): boolean { return !!this._initialized; }
	public get initializing(): boolean { return !!this._initializingPromise; }
	public get disposed(): boolean { return !!this._disposed; }
	public get disposing(): boolean { return !!this._disposingPromise; }

	public init(): Promise<void> {
		this.verifyNotDisposed();
		if (!this._initialized) {
			if (!this._initializingPromise) {
				const onInitializeResult = this.onInit();
				if (typeof (onInitializeResult) === "object" && onInitializeResult instanceof Promise) {
					this._initializingPromise = onInitializeResult.then(() => {
						this._initialized = true;
						delete this._initializingPromise;
					});
				} else {
					this._initialized = true;
					return Promise.resolve();
				}
			}
			return this._initializingPromise;
		}
		return Promise.resolve();
	}

	public dispose(): Promise<void> {
		if (!this._disposed) {
			if (!this._disposingPromise) {
				if (this._initializingPromise) {
					this._disposingPromise = this._initializingPromise.then(() => {
						const onDisposeResult = this.onDispose();
						if (typeof (onDisposeResult) === "object" && onDisposeResult instanceof Promise) {
							return onDisposeResult.then(() => {
								this._disposed = true;
								delete this._disposingPromise;
							});
						} else {
							this._disposed = true;
							return Promise.resolve();
						}
					});
				} else {
					const onDisposeResult = this.onDispose();
					if (typeof (onDisposeResult) === "object" && onDisposeResult instanceof Promise) {
						return this._disposingPromise = onDisposeResult.then(() => {
							this._disposed = true;
							delete this._disposingPromise;
						});
					} else {
						this._disposed = true;
						return Promise.resolve();
					}
				}
			}
			return this._disposingPromise;
		}
		return Promise.resolve();
	}


	protected abstract onInit(): void | Promise<void>;
	protected abstract onDispose(): void | Promise<void>;


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
