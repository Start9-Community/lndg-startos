import { gRPCHostId, gRPCPort } from 'lnd-startos/startos/interfaces'
import { baseSettingsPy } from './fileModels/base-settings.py'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { uiHostId, uiInterfaceId } from './interfaces'
import { sdk } from './sdk'
import {
  adminUsername,
  appDir,
  bridgeAddress,
  composeOverrides,
  dataDir,
  lndMount,
  lndRpcPlaceholder,
  settingsPath,
  uiPort,
} from './utils'

// Idempotent Django superuser sync. No-ops when no password is set — the
// critical task in `init/taskSetAdminCredentials.ts` handles prompting.
// Password is passed via env to keep it out of the shell command.
const ensureSuperuserPy = `
import os, sys
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', '')
if not password:
    sys.exit(0)
from django.contrib.auth import get_user_model
U = get_user_model()
username = os.environ['DJANGO_SUPERUSER_USERNAME']
u, _ = U.objects.get_or_create(username=username)
u.is_staff = True
u.is_superuser = True
u.is_active = True
u.set_password(password)
u.save()
`.trim()

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting LNDg...'))

  // Browser-facing hostnames of the UI interface, for ALLOWED_HOSTS / CSRF.
  // Exclude the LXC bridge and link-local addresses (neither is reached from a
  // browser) and bracket IPv6 so it composes into a valid host / origin.
  const hostnameInfo =
    (await sdk.host
      .getOwn(effects, uiHostId, (host) => {
        const ui =
          host &&
          Object.values(host.bindings)
            .flatMap((b) => Object.values(b.interfaces))
            .find((i) => i.id === uiInterfaceId)
        return ui
          ? ui.addressInfo
              .filter({ exclude: { kind: ['link-local', 'bridge'] } })
              .format('hostname-info')
          : []
      })
      .const()) ?? []
  const hostnames = hostnameInfo.map((h) =>
    h.metadata.kind === 'ipv6' ? `[${h.hostname}]` : h.hostname,
  )

  const allowedHosts = Array.from(
    new Set(['localhost', '127.0.0.1', ...hostnames]),
  )
  const csrfOrigins = Array.from(
    new Set([
      ...hostnames.map((h) => `https://${h}`),
      ...hostnames.map((h) => `http://${h}`),
    ]),
  )

  // LND's gRPC over the LXC bridge (replaces `lnd.startos:10009`). Resolved
  // reactively through the shared bridgeAddress helper against LND's `grpc`
  // host: the mapped value only changes when LND's assigned gRPC port does, so
  // main restarts exactly on LND install/uninstall/port-change — never on LND
  // updates or lock/unlock cycles (the binding entry and assignedPort persist
  // across those). LND's `grpc` binding is published only after the first
  // wallet unlock, so this resolves null until then; we write the loopback
  // placeholder in the meantime and the .const() heals on unlock (one
  // restart). LND's StartOS-issued cert covers the bridge address, verified
  // against the tls.cert read off the read-only LND mount.
  const lndRpcServer =
    (await bridgeAddress(effects, {
      packageId: 'lnd',
      hostId: gRPCHostId,
      internalPort: gRPCPort,
    }).const()) ?? lndRpcPlaceholder

  const adminPassword = await storeJson
    .read((s) => s.adminPassword)
    .const(effects)

  const baseSettings = await baseSettingsPy.read().const(effects)
  if (!baseSettings) {
    throw new Error('No base-settings.py')
  }

  const appSub = sdk.SubContainer.of(
    effects,
    { imageId: 'lndg' },
    sdk.Mounts.of()
      .mountVolume({
        volumeId: 'main',
        subpath: null,
        mountpoint: dataDir,
        readonly: false,
      })
      .mountDependency({
        dependencyId: 'lnd',
        volumeId: 'main',
        subpath: null,
        mountpoint: lndMount,
        readonly: true,
      }),
    'lndg-main',
  )

  // base (upstream-canonical) + overrides (StartOS). Python's
  // last-assignment-wins shadows upstream without mutating the base file.
  await appSub.writeFile(
    settingsPath,
    baseSettings +
      '\n' +
      composeOverrides({ allowedHosts, csrfOrigins, lndRpcServer }) +
      '\n',
  )

  return sdk.Daemons.of(effects)
    .addOneshot('migrate', {
      subcontainer: appSub,
      exec: {
        command: ['python', 'manage.py', 'migrate', '--noinput'],
        cwd: appDir,
        user: 'root',
      },
      requires: [],
    })
    .addOneshot('ensure-superuser', {
      subcontainer: appSub,
      exec: {
        command: ['python', 'manage.py', 'shell', '-c', ensureSuperuserPy],
        cwd: appDir,
        env: {
          DJANGO_SUPERUSER_USERNAME: adminUsername,
          ...(adminPassword && { DJANGO_SUPERUSER_PASSWORD: adminPassword }),
        },
        user: 'root',
      },
      requires: ['migrate'],
    })
    .addOneshot('collectstatic', {
      subcontainer: appSub,
      exec: {
        command: ['python', 'manage.py', 'collectstatic', '--noinput'],
        cwd: appDir,
        user: 'root',
      },
      requires: ['ensure-superuser'],
    })
    .addDaemon('primary', {
      subcontainer: appSub,
      exec: {
        command: ['python', 'controller.py', 'runserver', `0.0.0.0:${uiPort}`],
        cwd: appDir,
        user: 'root',
      },
      ready: {
        display: i18n('Web Interface'),
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, uiPort, {
            successMessage: i18n('The web interface is ready'),
            errorMessage: i18n('The web interface is not ready'),
          }),
        gracePeriod: 60_000,
      },
      requires: ['collectstatic'],
    })
})
