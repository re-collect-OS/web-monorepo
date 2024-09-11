// https://answers.netlify.com/t/unable-to-set-npm-package-version-in-the-environment-variables/77584/2
export const onPreBuild = function ({ netlifyConfig, packageJson }) {
  netlifyConfig.build.environment.APP_VERSION = packageJson.version;
};
