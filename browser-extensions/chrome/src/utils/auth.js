import {
  CognitoIdToken,
  CognitoAccessToken,
  CognitoRefreshToken,
  CognitoUserSession,
  CognitoUser,
  CognitoUserPool,
} from "amazon-cognito-identity-js";

import { Auth } from "aws-amplify";

export const authenticateWithSession = async ({ session, config }) => {
  return new Promise((resolve, reject) => {
    // https://stackoverflow.com/a/64325402
    const cognitoUser = new CognitoUser({
      Username: session.idToken.payload.email,
      Pool: new CognitoUserPool({
        UserPoolId: config.cognito.USER_POOL_ID,
        ClientId: config.cognito.APP_CLIENT_ID,
      }),
    });
    const userSession = new CognitoUserSession({
      IdToken: new CognitoIdToken({ IdToken: session.idToken.jwtToken }),
      AccessToken: new CognitoAccessToken({ AccessToken: session.accessToken.jwtToken }),
      RefreshToken: new CognitoRefreshToken({ RefreshToken: session.refreshToken.token }),
      ClockDrift: session.clockDrift,
    });

    cognitoUser.setSignInUserSession(userSession);
    // We have to set the user session using the Auth module for it to store the tokens in the right place (maybe)
    // https://stackoverflow.com/questions/55484977/aws-amplify-currentauthenticateduser-is-null-after-fb-login-in-react-native-but
    const authUser = Auth.createCognitoUser(cognitoUser.getUsername());
    authUser.setSignInUserSession(userSession);

    cognitoUser.getSession((err, session) => {
      if (session.isValid()) {
        resolve(session);
      } else {
        reject(err);
      }
    });
  });
};
