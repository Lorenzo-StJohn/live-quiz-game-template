import type { Action, Listener, Reducer } from './types.js';

export class Store<T> {
  private state: T;
  private reducer: Reducer<T>;
  private listeners: Listener<T>[];

  constructor(reducer: Reducer<T>, initialState: T) {
    this.reducer = reducer;
    this.state = initialState;
    this.listeners = [];
  }

  public getState() {
    return this.state;
  }

  public dispatch(action: Action) {
    const newState = this.reducer(this.state, action);

    if (newState !== this.state) {
      this.state = newState;
      this.listeners.forEach((listener) => listener(this.state, action));
    }
  }

  public subscribe(newListener: Listener<T>) {
    this.listeners.push(newListener);

    return () => {
      this.listeners.filter((listener) => listener !== newListener);
    };
  }
}
