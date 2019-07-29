import * as zxteam from "@zxteam/contract";
import { DUMMY_CANCELLATION_TOKEN } from "@zxteam/cancellation";
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
async function nextTick(): Promise<void> {
	await new Promise<void>(resolve => process.nextTick(resolve));
	await new Promise<void>(resolve => process.nextTick(resolve));
	await new Promise<void>(resolve => process.nextTick(resolve));
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

		const initPromise = disposable.init(DUMMY_CANCELLATION_TOKEN);

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

		const initPromise = disposable.init(DUMMY_CANCELLATION_TOKEN);

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

	it("Positive test onInit(): Promise<void> and onDispose(): void", async function () {
		const defer = Deferred.create();
		onInitPromise = defer.promise;
		try {
			const disposable = new TestInitable();
			assert.isFalse(disposable.initialized);
			assert.isFalse(disposable.initializing);
			assert.isFalse(disposable.disposed);
			assert.isFalse(disposable.disposing);

			disposable.verifyNotDisposed(); // should not raise an error
			assert.throw(() => disposable.verifyInitialized()); // should raise an error
			assert.throw(() => disposable.verifyInitializedAndNotDisposed()); // should raise an error

			const initPromise = disposable.init(DUMMY_CANCELLATION_TOKEN);

			assert.isFalse(disposable.initialized);
			assert.isTrue(disposable.initializing);
			assert.isFalse(disposable.disposed);
			assert.isFalse(disposable.disposing);

			defer.resolve();

			assert.isFalse(disposable.initialized);
			assert.isTrue(disposable.initializing);
			assert.isFalse(disposable.disposed);
			assert.isFalse(disposable.disposing);

			const disposablePromise = disposable.dispose();

			await nextTick();

			assert.isTrue(disposable.initialized);
			assert.isFalse(disposable.initializing);
			assert.isTrue(disposable.disposed);
			assert.isFalse(disposable.disposing);
		} finally {
			onInitPromise = null;
		}
	});

	it("Positive test onInit(): Promise<void> and onDispose(): Promise<void>", async function () {
		const disposable = new TestInitable();
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		disposable.verifyNotDisposed(); // should not raise an error

		const initDefer = Deferred.create();
		const disposeDefer = Deferred.create();
		onInitPromise = initDefer.promise;
		onDisposePromise = disposeDefer.promise;
		try {
			let initablePromiseResolved = false;
			let disposablePromiseResolved = false;
			const initablePromise = disposable.init(DUMMY_CANCELLATION_TOKEN).then(() => { initablePromiseResolved = true; });
			const disposablePromise = disposable.dispose().then(() => { disposablePromiseResolved = true; });

			assert.isFalse(initablePromiseResolved);
			assert.isFalse(disposablePromiseResolved);
			assert.throw(() => disposable.verifyNotDisposed());

			await nextTick();

			assert.isFalse(initablePromiseResolved);
			assert.isFalse(disposablePromiseResolved);
			assert.throw(() => disposable.verifyNotDisposed());

			assert.isFalse(disposable.initialized);
			assert.isFalse(disposable.disposed);
			assert.isTrue(disposable.initializing);
			assert.isTrue(disposable.disposing);

			let secondDisposablePromiseResolved = false;
			disposable.dispose().then(() => { secondDisposablePromiseResolved = true; });

			assert.isFalse(secondDisposablePromiseResolved);

			await nextTick();

			assert.isFalse(disposablePromiseResolved);
			assert.isFalse(secondDisposablePromiseResolved);
			assert.throw(() => disposable.verifyNotDisposed());
			assert.isFalse(disposable.disposed);
			assert.isTrue(disposable.disposing);

			initDefer.resolve();
			disposeDefer.resolve();

			assert.isFalse(disposablePromiseResolved);
			assert.isFalse(secondDisposablePromiseResolved);
			assert.throw(() => disposable.verifyNotDisposed());

			await nextTick();

			assert.isTrue(disposablePromiseResolved);
			assert.isTrue(secondDisposablePromiseResolved);
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

	it("Twice call of init()", async function () {
		onInitPromise = Promise.resolve();

		const disposable = new TestInitable();

		const initPromise1 = disposable.init(DUMMY_CANCELLATION_TOKEN);

		await nextTick();

		disposable.verifyNotDisposed(); // should not raise an error
		disposable.verifyInitialized(); // should not raise an error
		disposable.verifyInitializedAndNotDisposed(); // should not raise an error

		assert.isTrue(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		await initPromise1;

		disposable.verifyNotDisposed(); // should not raise an error
		disposable.verifyInitialized(); // should not raise an error
		disposable.verifyInitializedAndNotDisposed(); // should not raise an error

		assert.isTrue(disposable.initialized);
		assert.isFalse(disposable.initializing);
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		let isSuccessed = false;
		const initPromise2 = disposable.init(DUMMY_CANCELLATION_TOKEN).finally(() => { isSuccessed = true; });
		await nextTick();
		assert.isTrue(isSuccessed);
		await initPromise2;
		await disposable.dispose();
	});

	it("Should throw error from init()", async function () {
		class MyInitable extends Initable {
			protected onInit(): Promise<void> { return Promise.reject(new Error("test error")); }
			protected onDispose(): Promise<void> { return Promise.resolve(); }
		}

		const initable = new MyInitable();

		let expectedError: Error | null = null;
		try {
			await initable.init(DUMMY_CANCELLATION_TOKEN);
		} catch (e) {
			expectedError = e;
		}

		assert.isNotNull(expectedError);
		assert.instanceOf(expectedError, Error);
		assert.equal((expectedError as Error).message, "test error");
	});

	it("Should throw error from dispose()", async function () {
		class MyInitable extends Initable {
			protected onInit(): Promise<void> { return Promise.resolve(); }
			protected onDispose(): Promise<void> { return Promise.reject(new Error("test error")); }
		}

		const initable = new MyInitable();

		await initable.init(DUMMY_CANCELLATION_TOKEN);

		let expectedError: Error | null = null;
		try {
			await initable.dispose();
		} catch (e) {
			expectedError = e;
		}

		assert.isNotNull(expectedError);
		assert.instanceOf(expectedError, Error);
		assert.equal((expectedError as Error).message, "test error");
	});

	// it("Should execute and wait for initable and disposable tasks", async function () {
	// 	let onInitTaskCalled = false;
	// 	let onDisposeTaskCalled = false;

	// 	const onInitTask: Promise<void> = Task.create(() => {
	// 		onInitTaskCalled = true;
	// 	});
	// 	const onDisposeTask: Promise<void> = Task.create(() => {
	// 		onDisposeTaskCalled = true;
	// 	});

	// 	class MyInitable extends Initable {
	// 		protected onInit(): Promise<void> { return onInitTask; }
	// 		protected onDispose(): Promise<void> { return onDisposeTask; }
	// 	}

	// 	const initable = new MyInitable();

	// 	await initable.init();
	// 	assert.isTrue(onInitTaskCalled, "init() should execute init task");

	// 	await initable.dispose();
	// 	assert.isTrue(onDisposeTaskCalled, "dispose() should execute dispose task");
	// });

	// it("Should execute and wait for initable and disposable tasks if called both init() + dispose()", async function () {
	// 	let onInitTaskCalled = false;
	// 	let onDisposeTaskCalled = false;

	// 	const onInitTask: zxteam.Task = Task.create(() => {
	// 		onInitTaskCalled = true;
	// 	});
	// 	const onDisposeTask: zxteam.Task = Task.create(() => {
	// 		onDisposeTaskCalled = true;
	// 	});

	// 	class MyInitable extends Initable {
	// 		protected onInit(): Promise<void> { return onInitTask; }
	// 		protected onDispose(): Promise<void> { return onDisposeTask; }
	// 	}

	// 	const initable = new MyInitable();

	// 	initable.init(DUMMY_CANCELLATION_TOKEN);
	// 	await initable.dispose();

	// 	assert.isTrue(onInitTaskCalled, "init() should execute init task");
	// 	assert.isTrue(onDisposeTaskCalled, "dispose() should execute dispose task");
	// });
});
