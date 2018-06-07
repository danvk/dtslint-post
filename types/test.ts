import * as _ from 'my-underscore';

const stooges = [{ name: 'moe', age: 40 }, { name: 'larry', age: 50 }, { name: 'curly', age: 60 }];
_.pluck(stooges, 'name');  // $ExpectType string[]

// Existing behavior
_.map([1, 2, 3], x => x * x);  // $ExpectType number[]
_.map([1, 2, 3], x => '' + x);  // $ExpectType string[]

_.map(['1', '2'], (
  x, // $ExpectType string
  i, // $ExpectType number
  array // $ExpectType string[]
) => 0);

// New behavior
_.map(stooges, 'name');  // $ExpectType string[]
_.map(stooges, 'age');  // $ExpectType number[]

_.map([1, 2], function() {
  this;  // $ExpectType Date
}, new Date());
