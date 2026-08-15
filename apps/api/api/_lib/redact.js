/**
 * Redacción de secretos para el visor público de logs (/logs).
 *
 * La ruta es pública, así que TODA línea pasa por aquí antes de entrar al
 * buffer. Redactamos en el ingreso (no al servir) para que un secreto nunca
 * llegue a quedar en memoria en claro.
 */

/** Variables cuyo VALOR literal jamás debe aparecer en un log. */
const SECRET_ENV_KEYS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'POSTGRES_PASSWORD',
  'POSTGRES_USER',
  'REDIS_URL',
  'JWT_SECRET',
  'BLOB_READ_WRITE_TOKEN',
  'LOGS_TOKEN',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_DB_PASSWORD',
];

/**
 * Secuencias de escape ANSI (los colores del ConsoleLogger de Nest).
 * Se construye con fromCharCode porque un ESC literal en el fuente dispara
 * lint/suspicious/noControlCharactersInRegex.
 */
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, 'g');

/**
 * Valores literales a enmascarar: los propios valores de las env secretas y,
 * además, la contraseña embebida dentro de una URL de Postgres.
 * Se recalcula por invocación porque en serverless el entorno puede cambiar
 * entre despliegues sin reiniciar el módulo.
 */
function literalSecrets() {
  const found = [];

  for (const key of SECRET_ENV_KEYS) {
    const value = process.env[key];
    if (typeof value !== 'string' || value.length < 6) continue;
    found.push({ value, label: key });

    // La password dentro de postgresql://user:password@host/db
    const credentials = /^[a-z+]+:\/\/([^:/@]+):([^@]+)@/i.exec(value);
    if (credentials) {
      if (credentials[1].length >= 3) found.push({ value: credentials[1], label: `${key}_USER` });
      if (credentials[2].length >= 3)
        found.push({ value: credentials[2], label: `${key}_PASSWORD` });
    }
  }

  // Los más largos primero: evita que un fragmento corto rompa el match largo.
  return found.sort((a, b) => b.value.length - a.value.length);
}

/** Patrones genéricos de secretos, independientes del entorno. */
const PATTERNS = [
  // Credenciales en cualquier URI: scheme://user:pass@host
  [/([a-z][a-z0-9+.-]*:\/\/)[^:/?#@\s]+:[^@\s]+@/gi, '$1[REDACTADO]:[REDACTADO]@'],
  // JSON Web Tokens
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '[JWT_REDACTADO]'],
  // Authorization: Bearer / Basic
  [/\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{12,}/gi, '$1 [REDACTADO]'],
  // Hashes bcrypt (passwordHash de la tabla users)
  [/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g, '[BCRYPT_REDACTADO]'],
  // Campos sensibles en JSON o querystring
  [
    /("|')?\b(password|passwordHash|password_hash|contrasena|contrasena_hash|secret|token|apiKey|api_key|authorization|cookie|set-cookie|captchaAnswer|answerHash|answer_hash)\1?\s*[:=]\s*("|')?([^"',&\s}]{3,})\3?/gi,
    (match, q1, field, q2) => {
      const quote = q1 || '';
      const inner = q2 || '';
      return `${quote}${field}${quote}${q1 ? ':' : '='}${inner}[REDACTADO]${inner}`;
    },
  ],
  // Claves de proveedores conocidos
  [/\b(sk|pk|rk)-[A-Za-z0-9]{16,}/g, '[API_KEY_REDACTADA]'],
  [/\bsbp_[A-Za-z0-9]{20,}/g, '[SUPABASE_KEY_REDACTADA]'],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/g, '[GITHUB_TOKEN_REDACTADO]'],
  // Correos: dejamos dominio (útil para depurar) pero no la identidad
  [
    /\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g,
    (_match, first, domain) => `${first}***${domain}`,
  ],
];

/**
 * Limpia ANSI y enmascara cualquier secreto encontrado.
 * @param {unknown} input
 * @returns {string}
 */
function redact(input) {
  let text = typeof input === 'string' ? input : String(input);
  text = text.replace(ANSI, '');

  for (const secret of literalSecrets()) {
    text = text.split(secret.value).join(`[REDACTADO:${secret.label}]`);
  }

  for (const [pattern, replacement] of PATTERNS) {
    text = text.replace(pattern, replacement);
  }

  return text;
}

/**
 * Describe una URL de conexión sin exponer credenciales ni nombre de la base.
 * Sirve para el panel de diagnóstico: lo que importa es el host y el puerto.
 * @param {string | undefined} value
 */
function describeConnectionUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return {
      protocol: url.protocol.replace(':', ''),
      host: url.hostname,
      port: url.port || '(por defecto)',
      hasCredentials: Boolean(url.username),
      params: url.searchParams.toString() || '(ninguno)',
    };
  } catch {
    return {
      protocol: '(no parseable)',
      host: '(no parseable)',
      port: '',
      hasCredentials: false,
      params: '',
    };
  }
}

module.exports = { redact, describeConnectionUrl, SECRET_ENV_KEYS };
