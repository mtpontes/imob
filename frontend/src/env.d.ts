interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaEnv {
  readonly NG_APP_COGNITO_USER_POOL_ID: string;
  readonly NG_APP_COGNITO_CLIENT_ID: string;
  readonly NG_APP_COGNITO_DOMAIN: string;
  [key: string]: any;
}
