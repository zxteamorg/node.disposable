import { Disposable } from "@zxteam/contract";

import { assert } from "chai";

import { DisposableMixin } from "../src";

import * as tools from "./tools";


describe("DisposableMixin tests", function () {

	let onDisposePromise: Promise<void> | null = null;

	class TestDisposable implements Disposable {
		public throwIfDisposed() {
			this.verifyNotDisposed();
		}

		protected onDispose(): void | Promise<void> {
			if (onDisposePromise) {
				return onDisposePromise;
			}
		}
	}
	interface TestDisposable extends DisposableMixin { }
	DisposableMixin.applyMixin(TestDisposable);

	it("Positive test onDispose(): Promise<void>", async function () {
		const disposable = new TestDisposable();
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		disposable.throwIfDisposed(); // should not raise an error

		const defer = tools.Deferred.create();
		onDisposePromise = defer.promise;
		try {
			let disposablePromiseResolved = false;
			const disposablePromise = disposable.dispose().then(() => { disposablePromiseResolved = true; });

			assert.isFalse(disposablePromiseResolved);
			assert.throw(() => disposable.throwIfDisposed());

			await tools.nextTick();

			assert.isFalse(disposablePromiseResolved);
			assert.throw(() => disposable.throwIfDisposed());

			assert.isFalse(disposable.disposed);
			assert.isTrue(disposable.disposing);

			let secondDisposablePromiseResolved = false;
			disposable.dispose().then(() => { secondDisposablePromiseResolved = true; });

			assert.isFalse(secondDisposablePromiseResolved);

			await tools.nextTick();

			assert.isFalse(disposablePromiseResolved);
			assert.isFalse(secondDisposablePromiseResolved);
			assert.throw(() => disposable.throwIfDisposed());
			assert.isFalse(disposable.disposed);
			assert.isTrue(disposable.disposing);

			defer.resolve();

			assert.isFalse(disposablePromiseResolved);
			assert.isFalse(secondDisposablePromiseResolved);
			assert.throw(() => disposable.throwIfDisposed());

			await tools.nextTick();

			assert.isTrue(disposablePromiseResolved);
			assert.isTrue(secondDisposablePromiseResolved);
			assert.throw(() => disposable.throwIfDisposed());

			assert.isTrue(disposable.disposed);
			assert.isFalse(disposable.disposing);

			let thirdDisposablePromiseResolved = false;
			disposable.dispose().then(() => { thirdDisposablePromiseResolved = true; });
			assert.isFalse(thirdDisposablePromiseResolved);
			await tools.nextTick();
			assert.isTrue(thirdDisposablePromiseResolved);
		} finally {
			onDisposePromise = null;
		}
	});

	it("Positive test onDispose(): void", async function () {
		const disposable = new TestDisposable();
		assert.isFalse(disposable.disposed);
		assert.isFalse(disposable.disposing);

		disposable.throwIfDisposed(); // should not raise an error

		const disposablePromise = disposable.dispose();

		assert.isTrue(disposable.disposed);
		assert.isFalse(disposable.disposing);

		assert.throw(() => disposable.throwIfDisposed());

		await tools.nextTick();

		assert.throw(() => disposable.throwIfDisposed());

		assert.isTrue(disposable.disposed);
		assert.isFalse(disposable.disposing);

		await disposablePromise;

		assert.throw(() => disposable.throwIfDisposed());

		assert.isTrue(disposable.disposed);
		assert.isFalse(disposable.disposing);
	});

	it("Should throw error from dispose()", async function () {
		class MyDisposable implements Disposable {
			protected onDispose(): Promise<void> { return Promise.reject(new Error("test error")); }
		}
		interface MyDisposable extends DisposableMixin {}
		DisposableMixin.applyMixin(MyDisposable);

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
