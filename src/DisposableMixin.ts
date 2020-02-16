import { Disposable } from "./Disposable";

export class DisposableMixin extends Disposable {
	public static applyMixin(targetClass: any): void {
		Object.getOwnPropertyNames(Disposable.prototype).forEach(name => {
			const propertyDescr = Object.getOwnPropertyDescriptor(Disposable.prototype, name);

			if (name === "constructor") {
				// Skip constructor
				return;
			}

			if (propertyDescr !== undefined) {
				Object.defineProperty(targetClass.prototype, name, propertyDescr);
			}
		});

		Object.getOwnPropertyNames(DisposableMixin.prototype).forEach(name => {
			const propertyDescr = Object.getOwnPropertyDescriptor(DisposableMixin.prototype, name);

			if (name === "constructor") {
				// Skip constructor
				return;
			}
			if (name === "onDispose") {
				// Add NOP methods into mixed only if it not implements its
				if (propertyDescr !== undefined) {
					const existingPropertyDescr = Object.getOwnPropertyDescriptor(targetClass.prototype, name);
					if (existingPropertyDescr === undefined) {
						Object.defineProperty(targetClass.prototype, name, propertyDescr);
					}
				}
				return;
			}

			if (propertyDescr !== undefined) {
				Object.defineProperty(targetClass.prototype, name, propertyDescr);
			}
		});
	}

	protected onDispose(): void | Promise<void> {
		// Do nothing here by design. Users will override this method.
	}

	private constructor() {
		super();
		// Never called, due mixin
		// Private constructor has two kinds of responsibility
		// 1) Restrict to extends the mixin
		// 2) Restrict to make instances of the mixin
	}
}
