// https://gist.github.com/Yopadd/d1381e0fdc1aa6bedaeb36b7a8381892

export async function asyncFlatMap(arr, asyncFn) {
  return Promise.all(flatten(await asyncMap(arr, asyncFn)));
}

export function asyncMap(arr, asyncFn) {
  return Promise.all(arr.map(asyncFn));
}

export function flatMap(arr, fn) {
  return flatten(arr.map(fn));
}

export function flatten(arr) {
  return [].concat(...arr);
}
