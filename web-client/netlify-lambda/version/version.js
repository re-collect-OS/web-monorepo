exports.handler = async function (event, context, callback) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      ref: process.env.COMMIT_REF,
      appVersion: process.env.APP_VERSION,
    }),
  };
};
