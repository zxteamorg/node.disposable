import { CancellationToken } from "@zxteam/contract";

import { Initable } from "./Initable";

export class InitableMixin extends Initable {
	public static applyMixin(targetClass: any): void {
		Object.getOwnPropertyNames(Initable.prototype).forEach(name => {
			const propertyDescr = Object.getOwnPropertyDescriptor(Initable.prototype, name);

			if (name === "constructor") {
				// Skip constructor
				return;
			}

			if (propertyDescr !== undefined) {
				Object.defineProperty(targetClass.prototype, name, propertyDescr);
			}
		});

		Object.getOwnPropertyNames(InitableMixin.prototype).forEach(name => {
			const propertyDescr = Object.getOwnPropertyDescriptor(InitableMixin.prototype, name);

			if (name === "constructor") {
				// Skip constructor
				return;
			}
			if (name === "onInit" || name === "onDispose") {
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

	protected onInit(cancellationToken: CancellationToken): void | Promise<void> {
		// Do nothing here by design. Users will override this method.
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
