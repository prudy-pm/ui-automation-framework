import { test } from '@playwright/test';

// "proceedToCheckout" -> "proceed to checkout"
const words = (name: string): string => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();

// test.info() throws outside a running test (e.g. globalSetup.ts reuses LoginPage) -- no-op there instead.
const insideTest = (): boolean => {
  try {
    test.info();
    return true;
  } catch {
    return false;
  }
};

// Method decorator: each call becomes a named step, e.g. CartPage.proceedToCheckout -> "Cart: proceed to
// checkout". `box: true` points a failure at the calling line in the spec instead of inside this decorator.
export function step<This, Args extends unknown[], Return>(
  target: (this: This, ...args: Args) => Promise<Return>,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<Return>>,
) {
  return function (this: This, ...args: Args): Promise<Return> {
    if (!insideTest()) return target.call(this, ...args);
    const owner = (this as object).constructor.name.replace(/(Page|Component)$/, '');
    const name = `${owner}: ${words(String(context.name))}`;
    return test.step(name, () => target.call(this, ...args), { box: true });
  };
}
