import { assert } from "chai";
import { Disposable, using } from "../src";

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
		protected onDispose(): void | Promise<void> {
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
	it("Should pass factory result to worker", async function () {
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
	it("Should NOT fail if dispose() raise an error", async function () {
		let executed = false;
		await using(() => ({ dispose: () => Promise.reject(new Error("Abnormal error")) }), (instance) => {
			executed = true;
		});
		assert.isTrue(executed);
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
});
