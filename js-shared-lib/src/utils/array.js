export const onlyUnique = (value, index, self) => self.indexOf(value) === index;

export const chunk = (arr, chunk_size) =>
  Array(Math.ceil(arr.length / chunk_size))
    .fill()
    .map((_, index) => index * chunk_size)
    .map((begin) => arr.slice(begin, begin + chunk_size));
