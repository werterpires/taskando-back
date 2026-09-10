import { readFileSync } from 'node:fs';

type SslPaths = { caPath?: string; certificatePath?: string; privateKeyPath?: string };

export function databaseSslOptions(paths: SslPaths = {
  caPath: process.env.SSL_CA_PATH,
  certificatePath: process.env.SSL_CERT_PATH,
  privateKeyPath: process.env.SSL_KEY_PATH,
}) {
  const caPath = paths.caPath?.trim();
  const certificatePath = paths.certificatePath?.trim();
  const privateKeyPath = paths.privateKeyPath?.trim();
  if (!caPath) {
    if (certificatePath || privateKeyPath) throw new Error('SSL_CA_PATH é obrigatório quando certificado ou chave do cliente estão configurados.');
    return undefined;
  }
  if (Boolean(certificatePath) !== Boolean(privateKeyPath)) throw new Error('SSL_CERT_PATH e SSL_KEY_PATH devem ser configurados juntos.');
  return {
    ca: readFileSync(caPath, 'utf8'),
    ...(certificatePath && privateKeyPath ? { cert: readFileSync(certificatePath, 'utf8'), key: readFileSync(privateKeyPath, 'utf8') } : {}),
    rejectUnauthorized: true as const,
  };
}
