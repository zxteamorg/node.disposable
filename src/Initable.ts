import * as zxteam from "@zxteam/contract";

export abstract class Initable implements zxteam.Initable {
	private _initialized?: boolean;
	private _initializingPromise?: Promise<this>;
	private _disposed?: boolean;
	private _disposingPromise?: Promise<void>;

	public get initialized(): boolean { return this._initialized === true; }
	public get initializing(): boolean { return this._initializingPromise !== undefined; }
	public get disposed(): boolean { return this._disposed === true; }
	public get disposing(): boolean { return this._disposingPromise !== undefined; }

	public init(cancellationToken: zxteam.CancellationToken): Promise<this> {
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
		if (!this._disposed) {
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


	protected abstract onInit(cancellationToken: zxteam.CancellationToken): void | Promise<void>;
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
