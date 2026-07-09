// Em producao, as variaveis sao injetadas pelo @ngx-env/builder a partir do .env
// configurado no CI/CD (Vercel, GitHub Actions, etc.).
// Nunca commite valores reais neste arquivo.
const env = (import.meta as any).env || {};

export const environment = {
  production: true,
  cognito: {
    userPoolId: (env.NG_APP_COGNITO_USER_POOL_ID as string) ?? '',
    clientId: (env.NG_APP_COGNITO_CLIENT_ID as string) ?? '',
    domain: (env.NG_APP_COGNITO_DOMAIN as string) ?? ''
  }
};
