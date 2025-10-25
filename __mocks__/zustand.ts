// Adapted from https://github.com/pmndrs/zustand/blob/main/docs/guides/testing.md
import type * as ZustandExportedTypes from "zustand";
import type { StateCreator, StoreApi } from "zustand";

export * from "zustand";

type Create = typeof ZustandExportedTypes.create;
type CreateStore = typeof ZustandExportedTypes.createStore;

// Zustand exports `create` for creating a React-enabled store, and `createStore` for creating "vanilla" ones.
const { create: actualCreate, createStore: actualCreateStore } = jest.requireActual<{
  create: Create;
  createStore: CreateStore;
}>("zustand");

export const storeResetFns = new Set<() => void>();

function resettableCreateFn(actual: Create): Create;
function resettableCreateFn(actual: CreateStore): CreateStore;
function resettableCreateFn<T extends <U>(creator: StateCreator<U>) => StoreApi<U>>(actual: T): T {
  const uncurried = <U>(stateCreator: StateCreator<U>) => {
    // When creating a store, we get its initial state, create a reset function, and add it to the set.
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

// reset all stores after each test run
afterEach(() => {
  // TODO we don't currently have React testing libraries installed. If we did, we'd need `act` in here.
  storeResetFns.forEach((resetFn) => resetFn());
});
