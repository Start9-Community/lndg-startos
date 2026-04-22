export const uiPort = 8889

// Path inside the subcontainer where the upstream lndg repo lives (WORKDIR of the image)
export const appDir = '/app' as const

// Path inside the subcontainer where LND's volume is mounted (read-only).
// Upstream `initialize.py --lnddir <path>` derives tls.cert, admin.macaroon,
// and channel.db paths from this.
export const lndMount = '/mnt/lnd' as const

// Path inside the subcontainer where the service's own `main` volume is mounted.
// Persists the sqlite DB and `base-settings.py` across container rebuilds.
export const dataDir = '/data' as const

// SQLite DB lives on the `main` volume. Overridden into settings.py by
// the appended overrides block at daemon start.
export const dbPath = `${dataDir}/db.sqlite3` as const

// Django settings file inside the subcontainer. Composed on every start as
// `<base-settings.py from volume> + \n + <overrides block>` and written to
// the subcontainer rootfs via `appSub.writeFile`. Ephemeral — regenerated
// each start so reactive interface changes flow through.
export const settingsPath = `${appDir}/lndg/settings.py` as const

// Persisted upstream-canonical settings.py filename on the main volume.
// Written once per install/upgrade by `init/bootstrapSettings.ts`.
export const baseSettingsFilename = 'base-settings.py' as const

// LND gRPC endpoint (resolved over StartOS internal DNS)
export const lndRpcHost = 'lnd.startos' as const
export const lndRpcPort = 10009

export const adminUsername = 'lndg-admin' as const

/**
 * StartOS-specific overrides appended to the upstream-canonical settings.py.
 *
 * Python processes top-to-bottom and later assignments win, so every name
 * here silently overrides whatever upstream emitted. This is the whole point
 * of the base+overrides pattern: we never touch upstream's content, we just
 * append ours.
 *
 * Only fields StartOS actually needs to override belong here. Anything
 * upstream owns (MIDDLEWARE, INSTALLED_APPS, AUTH_PASSWORD_VALIDATORS,
 * LOGIN_REQUIRED, SESSION_COOKIE_AGE, REST_FRAMEWORK, SECRET_KEY, ...)
 * flows through from base-settings.py untouched.
 *
 * Notably NOT overridden:
 *   - SECRET_KEY — upstream's `initialize.write_settings` generates a
 *     random 64-char value into base-settings.py. It's server-side crypto
 *     (session signing, password-reset tokens); unrelated to adminPassword.
 */
export function composeOverrides(opts: {
  allowedHosts: string[]
  csrfOrigins: string[]
}): string {
  const quote = (s: string) => `'${s.replace(/'/g, "\\'")}'`
  const hostsList = opts.allowedHosts.map(quote).join(', ')
  const originsList = opts.csrfOrigins.map(quote).join(', ')

  return `# --- StartOS overrides (appended at daemon start) ---
ALLOWED_HOSTS = [${hostsList}]
CSRF_TRUSTED_ORIGINS = [${originsList}]
# StartOS terminates TLS at a reverse proxy on the internal 10.0.3.0/24
# network and forwards HTTP to this service. Trust the forwarded scheme
# header so Django's calculated origin matches the browser's Origin header
# — without this, HTTPS-at-browser / HTTP-at-Django produces a CSRF Origin
# mismatch and every login POST 403s. Analogue of nextcloud's trusted_proxies.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
CORS_ALLOW_CREDENTIALS = True
CORS_ORIGIN_ALLOW_ALL = True
GRPC_DNS_RESOLVER = 'native'
LOGIN_URL = '/lndg-admin/login/'
LOGIN_REDIRECT_URL = '/'
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ${quote(dbPath)},
        'OPTIONS': {'timeout': 20},
    },
}
`
}
