# Testing Types: An Introduction to dtslint

## Outline

Points to make:
- This is analogous to unit tests
- Traditional tests on dtslint are negative, not positive.
  - Analogy would be unit tests without assertions. Just assert that it builds & doesn't `throw`.
  - Show how a simple `declare module "foo"` makes all tests pass.
- How to write tests
- Nod to FlowTyped
- ++Example of how this makes refactoring safer.
- Concerns around TypeScript versions
- This addresses one of TS's most annoying issues: inaccurate typings
- Multiplicity of versions: library version, typings version, TypeScript version

## Post

One of the very best things about TypeScript is the huge collection of third-party type declarations at DefinitelyTyped. Even if your favorite library isn't written in TypeScript, you can still get the benefits of type definitions by installing `@types/your-favorite-library`.

But all too often, unfortunately, these type declarations will be out of date, incomplete, imprecise, or just plain wrong. This leaves you in a bit of a pickle. You have a few options, none of which are good:

1. Use `any` types to hide the errors. The downside of this is that you lose the benefits of type checking.
1. Copy/paste the type declarations from DefinitelyTyped into your own project and fix/augment them. The downside of this is that you've effectively forked the types, and it's now your responsibility to keep them up-to-date.
1. Use [module augmentation][] to add just the missing methods using a `.d.ts` file in your own project. The downside of this is that it's difficult and not always possible. Your augmentation is tightly coupled to the implementation details of the upstream type declarations and liable to break if you ever update them.
1. Send a PR to DefinitelyTyped and wait for it to get merged. This is slow going and there's no guarantee it'll succeed.

The first two options are the most expedient, while the last two options are the best in the long run.

But why are type declarations imprecise or incomplete in the first place? One reason is that they're hard to test.

Let's say you find a runtime bug in your application. If you follow test-driven development, you'll first write a small failing test that demonstrates the issue before you move on to the fix.

Until recently, this was not possible with bugs in type declaration files. But Microsoft has introduced an exciting new tool, [dtslint][], which remedies this situation.

The rest of this post shows how to use `dtslint` and demonstrates its value.

## Alternate start

Does something look odd about this unit test?

```ts
it('should square 4', () => {
  square(4);
});
```

Sure! _It's not asserting anything!_ It doesn't matter whether `square` is implemented correctly. So long as the function doesn't throw an exception, this test will pass.

This isn't great. The test would be much better if it checked the return value of `square(4)`:

```ts
it('should square 4' () => {
  expect(square(4)).to.equal(16);
});
```

Crazy as the first example is, it's exactly how the type declarations in DefinitelyType have always been tested. It didn't matter what the type was, so long as the type checker didn't find any errors. Particularly in the presence of `any` types, this makes for some weak tests. Weak tests lead to imprecise and inaccurate typings, and they make refactoring type declarations scary.

Microsoft recently introduced a new tool, [dtslint][], which makes assertions in type declaration tests possible. The rest of this post explains how to use it to bring all the benefits of testing to type declaration files.

## A test without dtslint

Here are a few lines from the [underscore tests][bad test] for `_.pluck`, which I've [written about before][typed-pluck]:

```ts
var stooges = [{ name: 'moe', age: 40 }, { name: 'larry', age: 50 }, { name: 'curly', age: 60 }];
_.pluck(stooges, 'name');
```

Note the lack of assertions on the return type. What this is really checking is that there is a function named `_.pluck` and that it accepts a list and a string as parameters.

The return type should be `string[]`, but it's `any[]`. Too bad! How can we make the test fail?

## A test

`dtslint` to the rescue! To check the return type of the call to `_.pluck`, we can use an `// $ExpectType` assertion:

```ts
var stooges = [{ name: 'moe', age: 40 }, { name: 'larry', age: 50 }, { name: 'curly', age: 60 }];
_.pluck(stooges, 'name');  // $ExpectType string[]
```

When we run `tsc` on this test, it passes. but when we run `dtslint` on it, we get the following:

```
ERROR: 2:1  expect  Expected type to be:
  string[]
got:
  any[]
```

Tada! Caught!

We can make the declaration precise [using a mapped type][typed-pluck]:

```ts
export function pluck<K extends keyof T, T>(array: T[], key: K): T[K][];
```

Now we get the following:

```
Test with 2.8
Test with 2.7
Test with 2.6
Test with 2.5
Test with 2.4
Test with 2.3
Test with 2.2
Test with 2.1
Test with 2.0
Error: /Users/danvk/github/dtslint-post/types/index.d.ts:1:33
ERROR: 1:33  expect  Compile error in typescript@2.0 but not in typescript@2.1.
Fix with a comment '// TypeScript Version: 2.1' just under the header.
Cannot find name 'keyof'.
```

The tests pass with TypeScript 2.1+, but not with TypeScript 2.0. This make sense since `keyof` was [introduced in TypeScript 2.1][ts21-release-notes]. Before TS2.1, it wasn't possible to type `pluck` this precisely. So our only real option is to require a newer version using the suggested comment:

```ts
// TypeScript Version: 2.1
export function pluck<K extends keyof T, T>(array: T[], key: K): Array<T[K]>;
```

This gets at another reason that type declarations are hard to maintain. There are actually _three_ independent versions involved: the version of the library, the version of the typings and the version of the TypeScript compiler. FlowTyped chooses to [explicitly model this][flow-typed], whereas DefinitelyTyped does not.

## Refactoring with tests

Suppose we're working with type declarations for [lodash's `map` function][_map]:

```ts
export function map<U, V>(array: U[], fn: (u: U) => V): V[];
```

You use this much like `Array.prototype.map`:

```ts
_.map([1, 2, 3], x => x * x);  // returns [1, 4, 9].
```

Lodash has no `_.pluck` function. Instead, it adds a variant of `_.map`:

```ts
var stooges = [{ name: 'moe', age: 40 }, { name: 'larry', age: 50 }, { name: 'curly', age: 60 }];
_.map(stooges, 'age');  // returns [40, 50, 60].
```

We'd to model this in the type declarations, but it's scary to alter the type of such an important function! This is one of the very best reasons to write tests: they let you refactor with confidence. dtslint lets you do the same with type declarations.

Here's a dtslint test for `_.map` that covers both the old and new declarations:

```ts
// Existing behavior
_.map([1, 2, 3], x => x * x);  // $ExpectType number[]
_.map([1, 2, 3], x => '' + x);  // $ExpectType string[]

// New behavior
_.map(stooges, 'name');  // $ExpectType string[]
_.map(stooges, 'age');  // $ExpectType number[]
```

Now we can add an overload to the declaration for `map`:

```ts
export function map<U, V>(array: U[], fn: (u: U) => V): V[];
export function map<K extends keyof T, T>(array: T[], key: K): Array<T[K]>;
```

When `dtslint` passes, we can be confident that we've both added the new functionality _and_ avoided changing existing behavior.

## Testing callback parameters

Callbacks are pervasive in JavaScript and it's important that type declarations accurately model their parameters. `dtslint` can help here, too. If we're careful about formatting, we can make assertions about the types of callback parameters.

`_.map` actually passes three parameters to its callback. This snippet tests that all of them have the correct types inferred:

```ts
_.map(['1', '2'], (
  x, // $ExpectType string
  i, // $ExpectType number
  array // $ExpectType string[]
) => 0);
```

If we change any of those `$ExpectType` lines, we'll get an error. (This is often a good sanity check!)

## Testing the value of this

It's [famously hard][joke] to know what `this` refers to in JavaScript. But TypeScript can help! If a library manipulates `this` in its callbacks, then the type declarations should model that.

If you've made it this far, you won't be surprised to find out that `dtslint` can help here, too! Just write a type assertion for `this`:

```ts
// Declaration; note that this is more like underscore's map than lodash's.
export function map<U, V, C>(ary: U[], fn: (this: C, u: U, i: number, ary: U[]) => V, context: C): V[];

// Test
_.map([1, 2], function() {
  this;  // $ExpectType Date
}, new Date());
```

## Conclusion

Dealing with inaccurate or imprecise type declarations can be one of the most frustrating aspects of working in TypeScript. They can introduce false errors or give you an unwarranted sense of confidence by introducing `any` types where you weren't expecting them.

Testing is the key to improving an existing code base, and `dtslint` brings many of these benefits to TypeScript's type language. It lets you pin down existing behavior so that you can refactor type declarations with confidence. It even lets you do [test-driven development][tdd] with type declaration files!

`dtslint` is in use in the [DefinitelyTyped][] repo today. So if you're writing type declarations, please write some type assertions! And if you're changing existing type declarations, please write assertions for the existing behavior. It's my hope that, over the long run, `dtslint` will lead to dramatically higher quality type declarations for all TypeScript users. And that means a better TypeScript experience, even if you don't know that `dtslint` exists!

[module augmentation]: https://www.typescriptlang.org/docs/handbook/declaration-merging.html
[dtslint]:
[bad test]: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/3289762cca59308bf092e4b49ea2242ef27fc23e/types/underscore/underscore-tests.ts#L173-L174
[typed-pluck]:
[ts21-release-notes]:
[flow-typed]: https://github.com/flowtype/flow-typed/tree/614bf49aa8b00b72c41caab1120094bc10fb9476/definitions/npm/underscore_v1.x.x
[_map]: https://lodash.com/docs#map
[joke]: https://twitter.com/bendhalpern/status/578925947245633536?lang=en
[tdd]: https://en.wikipedia.org/wiki/Test-driven_development
[DefinitelyTyped]: https://github.com/DefinitelyTyped/DefinitelyTyped