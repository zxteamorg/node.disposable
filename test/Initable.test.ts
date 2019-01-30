import { assert } from "chai";
import { Initable } from "../src";

interface Deferred<T = any> {
	resolve: (value?: T) => void;
	reject: (err: any) => void;
	promise: Promise<T>;
}
namespace Deferred {
	export function create<T = void>(): Deferred<T> {
		const deferred: any = {};
		deferred.promise = new Promise<void>((r, j) => {
			deferred.resolve = r;
			deferred.reject = j;
		});
		return deferred;
	}
}
function nextTick(): Promise<void> {
	return new Promise<void>(resolve => process.nextTick(resolve));
}


describe("Initable tests", function () {

	let onInitPromise: Promise<void> | null = null;
	let onDisposePromise: Promise<void> | null = null;

	class TestInitable extends Initable {
		public verifyNotDisposed() {
			super.verifyNotDisposed();
		}
		public verifyInitializedAndNotDisposed() {
			super.verifyInitializedAndNotDisposed();
		}
		public verifyInitialized() {
			super.verifyInitialized();
		}

		protected onInit(): void | Promise<void> {
			if (onInitPromise) {
				return onInitPromise;
			}
		}

		protected onDispose(): void | Promise<void> {
			if (onDisposePromise) {
				return onDisposePromise;
			}
		}
	}

	it("Positive test onInit(): void and onDispose(): void", async function () {
		const disposable = new TestInitable();
		assert.isFalse(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		disposable.verifyNotDisposed(); // should not raise an error
		assert.throw(() => disposable.verifyInitialized()); // should raise an error
		assert.throw(() => disposable.verifyInitializedAndNotDisposed()); // should raise an error

		const initPromise = disposable.init();

		assert.isTrue(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		disposable.verifyNotDisposed(); // should not raise an error
		disposable.verifyInitialized(); // should not raise an error
		disposable.verifyInitializedAndNotDisposed(); // should not raise an error

		await nextTick();

		disposable.verifyNotDisposed(); // should not raise an error
		disposable.verifyInitialized(); // should not raise an error
		disposable.verifyInitializedAndNotDisposed(); // should not raise an error

		assert.isTrue(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		await initPromise;

		disposable.verifyNotDisposed(); // should not raise an error
		disposable.verifyInitialized(); // should not raise an error
		disposable.verifyInitializedAndNotDisposed(); // should not raise an error

		assert.isTrue(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		const disposePromise = disposable.dispose();

		disposable.verifyInitialized(); // should not raise an error
		assert.throw(() => disposable.verifyNotDisposed());
		assert.throw(() => disposable.verifyInitializedAndNotDisposed());

		assert.isTrue(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isTrue(disposable.disposed);
		assert.isFalse(disposable.disposing);
	});

	it("Positive test onInit(): void and onDispose(): Promise<void>", async function () {
		const disposable = new TestInitable();
		assert.isFalse(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		disposable.verifyNotDisposed(); // should not raise an error
		assert.throw(() => disposable.verifyInitialized()); // should raise an error
		assert.throw(() => disposable.verifyInitializedAndNotDisposed()); // should raise an error

		const initPromise = disposable.init();

		assert.isTrue(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		disposable.verifyNotDisposed(); // should not raise an error
		disposable.verifyInitialized(); // should not raise an error
		disposable.verifyInitializedAndNotDisposed(); // should not raise an error

		await nextTick();

		disposable.verifyNotDisposed(); // should not raise an error
		disposable.verifyInitialized(); // should not raise an error
		disposable.verifyInitializedAndNotDisposed(); // should not raise an error

		assert.isTrue(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		await initPromise;

		const defer = Deferred.create();
		onDisposePromise = defer.promise;
		try {
			let disposablePromiseResolved = false;
			const disposablePromise = disposable.dispose().then(() => { disposablePromiseResolved = true; });

			assert.isFalse(disposablePromiseResolved);
			assert.throw(() => disposable.verifyInitializedAndNotDisposed());
			assert.throw(() => disposable.verifyNotDisposed());

			await nextTick();

			assert.isFalse(disposablePromiseResolved);
			assert.throw(() => disposable.verifyInitializedAndNotDisposed());
			assert.throw(() => disposable.verifyNotDisposed());

			assert.isTrue(disposable.initialized);
			assert.isFalse(disposable.initializing);
			assert.isFalse(disposable.disposed);
			assert.isTrue(disposable.disposing);

			let secondDisposablePromiseResolved = false;
			disposable.dispose().then(() => { secondDisposablePromiseResolved = true; });

			assert.isFalse(secondDisposablePromiseResolved);

			await nextTick();

			assert.isFalse(disposablePromiseResolved);
			assert.isFalse(secondDisposablePromiseResolved);
			assert.throw(() => disposable.verifyInitializedAndNotDisposed());
			assert.throw(() => disposable.verifyNotDisposed());
			assert.isTrue(disposable.initialized);
			assert.isFalse(disposable.initializing);
			assert.isFalse(disposable.disposed);
			assert.isTrue(disposable.disposing);

			defer.resolve();

			assert.isFalse(disposablePromiseResolved);
			assert.isFalse(secondDisposablePromiseResolved);
			assert.throw(() => disposable.verifyInitializedAndNotDisposed());
			assert.throw(() => disposable.verifyNotDisposed());

			await nextTick();

			assert.isTrue(disposablePromiseResolved);
			assert.isTrue(secondDisposablePromiseResolved);
			assert.throw(() => disposable.verifyInitializedAndNotDisposed());
			assert.throw(() => disposable.verifyNotDisposed());

			assert.isTrue(disposable.disposed);
			assert.isFalse(disposable.disposing);

			let thirdDisposablePromiseResolved = false;
			disposable.dispose().then(() => { thirdDisposablePromiseResolved = true; });
			assert.isFalse(thirdDisposablePromiseResolved);
			await nextTick();
			assert.isTrue(thirdDisposablePromiseResolved);
		} finally {
			onDisposePromise = null;
		}
	});

	it("Positive test onDispose(): void", async function () {
		const disposable = new TestInitable();
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		disposable.verifyNotDisposed(); // should not raise an error

		const disposablePromise = disposable.dispose();

		assert.isTrue(disposable.disposed);
		assert.isFalse(disposable.disposing);

		assert.throw(() => disposable.verifyNotDisposed());

		await nextTick();

		assert.throw(() => disposable.verifyNotDisposed());

		assert.isTrue(disposable.disposed);
		assert.isFalse(disposable.disposing);

		await disposablePromise;

		assert.throw(() => disposable.verifyNotDisposed());

		assert.isTrue(disposable.disposed);
		assert.isFalse(disposable.disposing);
	});
});
