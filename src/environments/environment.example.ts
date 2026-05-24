// Copie para environment.local.ts (gitignored) e preencha o token.
// Como obter o token:
//   curl -s -X POST https://nalk.freedomai.com.br/api/session \
//     -H "Content-Type: application/json" \
//     -d '{"username":"...","password":"..."}'
export const environment = {
  production: false,
  // Em dev, '/api' é proxado para o Metabase via proxy.conf.json.
  // Em prod, troque por um backend que assine as requests.
  METABASE_BASE: '/api',
  METABASE_SESSION: 'COLE-AQUI-O-ID-DA-SESSAO',
};
