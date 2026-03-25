import type { Action, Listener, Reducer } from './types';

export class Store<T> {
  #state: T;
  #reducer: Reducer<T>;
  #listeners: Listener<T>[];

  constructor(reducer: Reducer<T>, initialState: T) {
    this.#reducer = reducer;
    this.#state = initialState;
    this.#listeners = [];
  }

  getState() {
    return this.#state;
  }

  dispatch(action: Action) {
    const newState = this.#reducer(this.#state, action);

    if (newState !== this.#state) {
      this.#state = newState;
      this.#listeners.forEach((listener) => listener(this.#state));
    }
  }

  subscribe(newListener: Listener<T>) {
    this.#listeners.push(newListener);

    return () => {
      this.#listeners.filter((listener) => listener !== newListener);
    };
  }
}
