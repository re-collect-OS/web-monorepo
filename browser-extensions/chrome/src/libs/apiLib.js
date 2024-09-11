import { API } from "aws-amplify";
import * as apiLib from "js-shared-lib/apiLib";

// Bind the API to the exported functions
// Note that all public function exports from apiLib are expected
// to take API as the first parameter!
const boundApiExports = {};
const keys = Object.keys(apiLib);
keys.forEach((key) => {
  const e = apiLib[key];
  if (typeof e === "function" && !key.startsWith("nobind")) {
    boundApiExports[key] = e.bind(null, API);
  } else {
    boundApiExports[key] = e;
  }
});

// Sadly this is the best we can do
// TODO revisit if we should make "aws-amplify" a shared dependency instead
export default boundApiExports;
