export const baseDevConfig = {
  api: {
    ENDPOINTS: [
      {
        name: "public",
        endpoint: "https://api.dev.recollect.cloud",
        region: "us-west-2",
      },
    ],
  },
  cognito: {
    REGION: "us-west-2",
    USER_POOL_ID: "us-west-2_ftAhAA70g",
    APP_CLIENT_ID: "37sl5upjevqmrhkhnmr96j8v19",
    IDENTITY_POOL_ID: "us-west-2:a8cedd2e-4dd3-4197-b223-907c8035b59d",
  },
};

export const baseProdConfig = {
  api: {
    ENDPOINTS: [
      {
        name: "public",
        endpoint: "https://api.recollect.cloud",
        region: "us-east-1",
      },
    ],
  },
  cognito: {
    REGION: "us-east-1",
    USER_POOL_ID: "us-east-1_aI1sTicDf",
    APP_CLIENT_ID: "7m3aetoms4q04rd13h93m7lbov",
    IDENTITY_POOL_ID: "us-east-1:c18adf9e-27a6-4f7e-ab79-5f4fcc15dd85",
  },
};

export const baseLocalConfig = {
  api: {
    ENDPOINTS: [
      {
        name: "public",
        endpoint: "http://localhost:8000",
        region: "irrelevant",
      },
    ],
  },
  cognito: {
    REGION: "irrelevant",
    USER_POOL_ID: process.env.LOCAL_COGNITO_USERPOOL_ID,
    APP_CLIENT_ID: process.env.LOCAL_COGNITO_APP_CLIENT_ID,
    IDENTITY_POOL_ID: "irrelevant",
    ENDPOINT: "http://localhost:9229",
    AUTH_FLOW_TYPE: "USER_PASSWORD_AUTH",
  },
};

export const baseDemoConfig = { ...baseProdConfig };
export const baseWipConfig = { ...baseDevConfig };
