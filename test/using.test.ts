import { assert } from "chai";
import { Task, CancelledError } from "ptask.js";

import { Disposable, using, Initable } from "../src";

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

describe("using tests", function () {
	class TestDisposable extends Disposable {
		protected onDispose(): void | Promise<void> | Task<void> {
			//
		}
	}
	class TestInitable extends Initable {
		protected onInit(): void | Promise<void> | Task<void> {
			//
		}
		protected onDispose(): void | Promise<void> | Task<void> {
			//
		}
	}

	it("Should pass Promise result to worker", async function () {
		const disposable = new TestDisposable();
		let executed = false;
		await using(Promise.resolve(disposable), (instance) => {
			executed = true;
			assert.strictEqual(disposable, instance);
		});
		assert.isTrue(executed);
		assert.isTrue(disposable.disposed);
		assert.isFalse(disposable.disposing);
	});
	it("Should pass Task result to worker", async function () {
		const disposable = new TestDisposable();
		let executed = false;
		await using(Task.resolve(disposable), (instance) => {
			executed = true;
			assert.strictEqual(disposable, instance);
		});
		assert.isTrue(executed);
		assert.isTrue(disposable.disposed);
		assert.isFalse(disposable.disposing);
	});
	it("Should pass factory result to worker (result is instance of Disposable)", async function () {
		let disposable: any;
		let executed = false;
		await using(() => (disposable = new TestDisposable()), (instance) => {
			executed = true;
			assert.strictEqual(disposable, instance);
		});
		assert.isTrue(executed);
		assert.isTrue(disposable.disposed);
		assert.isFalse(disposable.disposing);
	});
	it("Should pass factory result to worker (result is Promise<Disposable>)", async function () {
		let disposable: any;
		let executed = false;
		await using(() => Promise.resolve(disposable = new TestDisposable()), (instance) => {
			executed = true;
			assert.strictEqual(disposable, instance);
		});
		assert.isTrue(executed);
		assert.isTrue(disposable.disposed);
		assert.isFalse(disposable.disposing);
	});
	it("Should pass factory result to worker (result is Task<Disposable>)", async function () {
		let disposable: any;
		let executed = false;
		await using(() => Task.resolve(disposable = new TestDisposable()), (instance) => {
			executed = true;
			assert.strictEqual(disposable, instance);
		});
		assert.isTrue(executed);
		assert.isTrue(disposable.disposed);
		assert.isFalse(disposable.disposing);
	});
	it("Should NOT fail if dispose() raise an error", async function () {
		const originalConsole = (global as any).console;
		try {
			let executed = false;

			let expectedErrorMessage: any;
			let expectedErrorObj: any;

			(global as any).console = {
				error(msg: any, err: any) {
					expectedErrorMessage = msg;
					expectedErrorObj = err;
				}
			};
			await using(() => ({ dispose: () => Task.run(() => { throw new Error("Expected abnormal error"); }) }), (instance) => {
				executed = true;
			});
			assert.isTrue(executed);
			assert.isString(expectedErrorMessage);
			assert.equal(expectedErrorMessage,
				"Dispose method raised an error. This is unexpected behaviour due dispose() should be exception safe. The error was bypassed.");
			assert.instanceOf(expectedErrorObj, Error);
			assert.equal(expectedErrorObj.message, "Expected abnormal error");
		} finally {
			(global as any).console = originalConsole;
		}
	});
	it("Should fail when wrong disposable", async function () {
		let executed = false;
		let expectedError;
		try {
			await using(null as any, (instance) => {
				//
			});
		} catch (e) {
			expectedError = e;
		}
		assert.isDefined(expectedError);
		assert.include(expectedError.message, "Wrong argument");
		assert.isFalse(executed);
	});
	it("Should fail when wrong worker", async function () {
		let executed = false;
		let expectedError;
		try {
			await using(Promise.resolve(new TestDisposable()), null as any);
		} catch (e) {
			expectedError = e;
		}
		assert.isDefined(expectedError);
		assert.include(expectedError.message, "Wrong argument");
		assert.isFalse(executed);
	});
	it("Should fail with worker's error", async function () {
		const disposable = new TestDisposable();
		let executed = false; let expectedError;
		try {
			await using(Promise.resolve(disposable), (instance) => {
				executed = true;
				throw new Error("Test ERROR");
			});
		} catch (e) {
			expectedError = e;
		}
		assert.isDefined(expectedError);
		assert.equal(expectedError.message, "Test ERROR");
		assert.isTrue(executed);
		assert.isTrue(disposable.disposed);
		assert.isFalse(disposable.disposing);
	});
	it("Should fail with worker's reject", async function () {
		const disposable = new TestDisposable();
		let executed = false; let expectedError;
		try {
			await using(Promise.resolve(disposable), (instance) => {
				executed = true;
				return Promise.reject(new Error("Test ERROR"));
			});
		} catch (e) {
			expectedError = e;
		}
		assert.isDefined(expectedError);
		assert.equal(expectedError.message, "Test ERROR");
		assert.isTrue(executed);
		assert.isTrue(disposable.disposed);
		assert.isFalse(disposable.disposing);
	});
	it("using test onDispose(): Promise<void>", async function () {
		const defer = Deferred.create<number>();
		let usingPromiseResolved = false;
		const usingPromise = using(() => (new TestDisposable()), (instance) => defer.promise)
			.then((v) => { usingPromiseResolved = true; return v; });

		assert.isFalse(usingPromiseResolved);
		await nextTick();
		assert.isFalse(usingPromiseResolved);
		defer.resolve(42);
		assert.isFalse(usingPromiseResolved);
		await nextTick();
		assert.isTrue(usingPromiseResolved);
		const result = await usingPromise;
		assert.equal(result, 42);
	});
	it("Should be able to use CancellationToken on init phase", async function () {
		const cts = Task.createCancellationTokenSource();
		const token = cts.token;


		cts.cancel();

		const disposable: Disposable = new TestDisposable();
		let err;
		try {
			await using(
				(cancellationToken) => {
					cancellationToken.throwIfCancellationRequested();
					return disposable;
				},
				(instance, cancellationToken) => {
					// Do nothing
				},
				token
			);
		} catch (e) {
			err = e;
		}

		assert.isDefined(err);
		assert.instanceOf(err, CancelledError);
	});
	it("Should be able to use CancellationToken on worker phase", async function () {
		const cts = Task.createCancellationTokenSource();
		const token = cts.token;

		const disposable: Disposable = new TestDisposable();

		let onDisposeCalled = false;
		(disposable as any).onDispose = () => {
			onDisposeCalled = true;
		};

		let err;
		try {
			await using(
				(cancellationToken) => {
					cts.cancel();
					return disposable;
				},
				(instance, cancellationToken) => {
					cancellationToken.throwIfCancellationRequested();
					// Do nothing
				},
				token
			);
		} catch (e) {
			err = e;
		}

		assert.isDefined(err);
		assert.instanceOf(err, CancelledError);
		assert.isTrue(onDisposeCalled);
	});
	it("Should call init() for Initable", async function () {
		const initable = new TestInitable();
		let executedAfterInit = false;
		await using(Promise.resolve(initable), (instance) => {
			executedAfterInit = initable.initialized;
			assert.strictEqual(initable, instance);
		});
		assert.isTrue(executedAfterInit);
		assert.isTrue(initable.initialized);
		assert.isFalse(initable.initializing);
		assert.isTrue(initable.disposed);
		assert.isFalse(initable.disposing);
	});
});
