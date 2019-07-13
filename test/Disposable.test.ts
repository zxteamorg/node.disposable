import * as zxteam from "@zxteam/contract";
import { assert } from "chai";
import { Disposable } from "../src";

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


describe("Disposable tests", function () {

	let onDisposePromise: Promise<void> | null = null;

	class TestDisposable extends Disposable {
		public verifyNotDisposed() {
			super.verifyNotDisposed();
		}

		protected onDispose(): void | Promise<void> {
			if (onDisposePromise) {
				return onDisposePromise;
			}
		}
	}

	it("Positive test onDispose(): Promise<void>", async function () {
		const disposable = new TestDisposable();
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		disposable.verifyNotDisposed(); // should not raise an error

		const defer = Deferred.create();
		onDisposePromise = defer.promise;
		try {
			let disposablePromiseResolved = false;
			const disposablePromise = disposable.dispose().then(() => { disposablePromiseResolved = true; });

			assert.isFalse(disposablePromiseResolved);
			assert.throw(() => disposable.verifyNotDisposed());

			await nextTick();

			assert.isFalse(disposablePromiseResolved);
			assert.throw(() => disposable.verifyNotDisposed());

			assert.isFalse(disposable.disposed);
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

			defer.resolve();

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
		const disposable = new TestDisposable();
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

	// it("Should execute and wait for disposable task", async function () {
	// 	let onDisposeTaskCalled = false;
	// 	const onDisposeTask: zxteam.Task = Task.create(() => {
	// 		onDisposeTaskCalled = true;
	// 	});

	// 	class MyDisposable extends Disposable {
	// 		protected onDispose(): Promise<void> { return onDisposeTask; }
	// 	}

	// 	const disposable = new MyDisposable();

	// 	await disposable.dispose();
	// 	assert.isTrue(onDisposeTaskCalled, "dispose() should execute dispose task");
	// });

	it("Should throw error from dispose()", async function () {
		class MyDisposable extends Disposable {
			protected onDispose(): Promise<void> { return Promise.reject(new Error("test error")); }
		}

		const disposable = new MyDisposable();

		let expectedError: Error | null = null;
		try {
			await disposable.dispose();
		} catch (e) {
			expectedError = e;
		}

		assert.isNotNull(expectedError);
		assert.instanceOf(expectedError, Error);
		assert.equal((expectedError as Error).message, "test error");
	});
});
