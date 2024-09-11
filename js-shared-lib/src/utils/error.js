export function errorToString(error) {
  let message;
  if (error.message) {
    message = error.message;
  } else if (error.data?.detail) {
    message = JSON.stringify(error.data.detail);
  } else {
    message = error.toString();
  }
  return message;
}
