import { CancellationToken, Initable as InitableLike } from "@zxteam/contract";

import { safeDispose } from "./safeDispose";

export abstract class Initable implements InitableLike {
	private _initialized?: boolean;
	private _initializingPromise?: Promise<this>;
	private _disposed?: boolean;
	private _disposingPromise?: Promise<void>;

	public get initialized(): boolean { return this._initialized === true; }
	public get initializing(): boolean { return this._initializingPromise !== undefined; }
	public get disposed(): boolean { return this._disposed === true; }
	public get disposing(): boolean { return this._disposingPromise !== undefined; }

	public init(cancellationToken: CancellationToken): Promise<this> {
		this.verifyNotDisposed();
		if (!this._initialized) {
			if (this._initializingPromise === undefined) {
				const onInitializeResult = this.onInit(cancellationToken);
				if (onInitializeResult instanceof Promise) {
					this._initializingPromise = onInitializeResult
						.then(() => this)
						.finally(() => {
							delete this._initializingPromise;
							this._initialized = true;
						});
				} else {
					this._initialized = true;
					return Promise.resolve(this);
				}
			}
			return this._initializingPromise;
		}
		return Promise.resolve(this);
	}

	public dispose(): Promise<void> {
		if (this._disposed !== true) {
			if (this._disposingPromise === undefined) {
				if (this._initializingPromise !== undefined) {
					this._disposingPromise = this._initializingPromise
						.then(async () => this.onDispose())
						.finally(() => {
							delete this._disposingPromise;
							this._disposed = true;
						});
				} else {
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
			}
			return this._disposingPromise;
		}
		return Promise.resolve();
	}

	public static async initAll(cancellationToken: CancellationToken, ...instances: ReadonlyArray<InitableLike>): Promise<void> {
		const intializedInstances: Array<InitableLike> = [];
		try {
			for (const instance of instances) {
				await instance.init(cancellationToken);
				intializedInstances.push(instance);
			}
		} catch (e) {
			for (const intializedInstance of intializedInstances.reverse()) {
				await safeDispose(intializedInstance);
			}
			throw e;
		}
	}

	protected abstract onInit(cancellationToken: CancellationToken): void | Promise<void>;
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
