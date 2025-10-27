// Adapted from https://github.com/pmndrs/zustand/blob/main/docs/guides/testing.md
import type { create as Create, createStore as CreateStore, StateCreator, StoreApi } from "zustand";

export * from "zustand";

// Zustand exports `create` for creating a React-enabled store, and `createStore` for creating a "vanilla" one.
type ZustandActual = {
  create: typeof Create;
  createStore: typeof CreateStore;
};

const { create: actualCreate, createStore: actualCreateStore } = jest.requireActual<ZustandActual>("zustand");

export const storeResetFns = new Set<() => void>();

function resettableCreateFn<T extends <U>(creator: StateCreator<U>) => StoreApi<U>>(actual: T): T {
  const uncurried = <U>(stateCreator: StateCreator<U>): StoreApi<U> => {
    // When a test creates a store, we get its initial state and save a function to reset to that state.
    const store = actual(stateCreator);
    const initialState = store.getInitialState();
    storeResetFns.add(() => store.setState(initialState, true));
    return store;
  };

  return (<U>(stateCreator: StateCreator<U>) => {
    return typeof stateCreator === "function" ? uncurried(stateCreator) : uncurried;
  }) as T;
}

export const create = resettableCreateFn(actualCreate);
export const createStore = resettableCreateFn(actualCreateStore);

// After each test run, reset all stores.
afterEach(() => {
  // TODO we don't currently have React testing libraries installed. If we did, we'd need `act` in here.
  storeResetFns.forEach((resetFn) => resetFn());
});
