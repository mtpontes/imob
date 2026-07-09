export const environment = {
  production: true,
  cognito: {
    userPoolId: typeof import.meta.env !== 'undefined' ? (import.meta.env.NG_APP_COGNITO_USER_POOL_ID as string) : '',
    clientId: typeof import.meta.env !== 'undefined' ? (import.meta.env.NG_APP_COGNITO_CLIENT_ID as string) : '',
    domain: typeof import.meta.env !== 'undefined' ? (import.meta.env.NG_APP_COGNITO_DOMAIN as string) : ''
  }
};
