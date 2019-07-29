import { safeDispose } from "../src";

describe("safeDispose tests", function () {
	it("should safe dispose number", async function () {
		await safeDispose(5);
	});
	it("should safe dispose non-disposable object", async function () {
		await safeDispose({ a: 42 });
	});
	it("should safe dispose non-disposable object", async function () {
		await safeDispose({ dispose: 42 });
	});
	it("should safe dispose disposable object", async function () {
		const obj = {
			dispose: () => { /* nop */ }
		};
		await safeDispose(obj);
	});
	it("should safe dispose disposable object", async function () {
		const obj = {
			dispose: () => Promise.resolve()
		};
		await safeDispose(obj);
	});
	it("should safe dispose suppress an error", async function () {
		const obj = {
			dispose: () => { throw new Error("Should be suppressed"); }
		};
		await safeDispose(obj);
	});
});
