// As variaveis NG_APP_* sao injetadas em tempo de build pelo @ngx-env/builder
// a partir do arquivo .env (ou .env.local) na raiz do diretorio frontend.
// Nunca commite valores reais — use .env.local (gitignored) localmente.
export const environment = {
  production: false,
  cognito: {
    userPoolId: import.meta.env['NG_APP_COGNITO_USER_POOL_ID'] as string ?? '',
    clientId: import.meta.env['NG_APP_COGNITO_CLIENT_ID'] as string ?? '',
    domain: import.meta.env['NG_APP_COGNITO_DOMAIN'] as string ?? ''
  }
};
