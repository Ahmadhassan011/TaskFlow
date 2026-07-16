import { vi } from 'vitest';

// Auto-mocking Prisma client for unit tests. Any `prisma.<model>.<method>` access
// resolves to a cached `vi.fn()` (so the same function instance is shared between a
// test's `mockPrisma.x.y.mockResolvedValue(...)` and the service under test). Methods
// that are never explicitly stubbed resolve to `undefined`, which is exactly what the
// services expect for the "guard skipped" branches.
type AnyFn = (...args: any[]) => any;

const fnCache = new Map<string, AnyFn>();

const getMethod = (model: string, method: string): AnyFn => {
  const key = `${model}.${method}`;
  let fn = fnCache.get(key);
  if (!fn) {
    fn = vi.fn();
    fnCache.set(key, fn);
  }
  return fn;
};

// Real function (not vi.fn) so resetAllMocks never neutralizes it.
const transaction = (arg: any) => {
  if (Array.isArray(arg)) {
    return Promise.all(arg.map((p: any) => (p && typeof p.then === 'function' ? p : Promise.resolve(p))));
  }
  return Promise.resolve(undefined);
};

const makeModel = (model: string): any =>
  new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === '$transaction') return transaction;
        return getMethod(model, prop);
      },
    }
  );

const modelCache = new Map<string, any>();

const mockPrisma: any = new Proxy(
  {},
  {
    get(_t, prop: string) {
      if (prop === '$transaction') return transaction;
      // Prevent accidental thenable behavior when the proxy is awaited.
      if (prop === 'then') return undefined;
      const name = typeof prop === 'string' ? prop : String(prop);
      let model = modelCache.get(name);
      if (!model) {
        model = makeModel(name);
        modelCache.set(name, model);
      }
      return model;
    },
  }
);

export { mockPrisma };
