export function pluck<K extends keyof T, T>(array: T[], key: K): Array<T[K]>;

export function map<U, V>(ary: U[], fn: (u: U, i: number, ary: U[]) => V): V[];
export function map<U, V, C>(ary: U[], fn: (this: C, u: U, i: number, ary: U[]) => V, context: C): V[];
export function map<K extends keyof T, T>(array: T[], key: K): Array<T[K]>;
