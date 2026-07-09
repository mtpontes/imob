/**
 * Polyfill necessario para a biblioteca amazon-cognito-identity-js no ambiente Karma/browser.
 * A lib depende do objeto global do Node.js, que nao existe no contexto browser.
 */
(window as any).global = window;
