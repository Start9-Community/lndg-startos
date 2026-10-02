import { gRPCHostId, gRPCPort } from 'lnd-startos/startos/interfaces'
import { baseSettingsPy } from './fileModels/base-settings.py'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  adminUsername,
  appDir,
  composeOverrides,
  dataDir,
  lndMount,
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
if not u.check_password(password):
    u.set_password(password)
u.save()
`.trim()

const lndCheckPy = `
import sys, grpc
try:
    from gui.lnd_deps import lightning_pb2 as ln, lightning_pb2_grpc as lnrpc
    from gui.lnd_deps.lnd_connect import lnd_connect
    lnrpc.LightningStub(lnd_connect()).GetInfo(ln.GetInfoRequest(), timeout=10)
except Exception as e:
    print((e.details() or e.code().name) if isinstance(e, grpc.RpcError) else e)
    sys.exit(1)
`.trim()

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting LNDg...'))

  // LND's gRPC over the LXC bridge (replaces `lnd.startos:10009`). Resolved
  // reactively with `sdk.host.getBridgeAddress` against LND's `grpc` host: the
  // bridge address only changes when LND's gRPC binding does, so main restarts
  // exactly on LND install/uninstall/port-change — never on LND updates or
  // lock/unlock cycles (the binding persists across those). LND's `grpc`
  // binding is published only after the first wallet unlock, so this resolves
  // null until then, and LNDg cannot start until then either: it reads LND's
  // macaroon at import. The .const() re-runs main once the binding appears.
  // LND's StartOS-issued cert covers the bridge address, verified against the
  // tls.cert read off the read-only LND mount.
  const lndRpcServer = await sdk.host
    .getBridgeAddress(effects, {
      packageId: 'lnd',
      hostId: gRPCHostId,
      internalPort: gRPCPort,
    })
    .const()

  const store = await storeJson.read().const(effects)
  if (!store?.secretKey) {
    throw new Error('No secret key in store.json')
  }

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
      composeOverrides(lndRpcServer, store.secretKey) +
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
          ...(store.adminPassword && {
            DJANGO_SUPERUSER_PASSWORD: store.adminPassword,
          }),
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
        // PID 1, so the controller's workers stop with it and cannot outlive it.
        command: [
          'sh',
          '-c',
          `trap 'kill -TERM -1; exit 0' TERM; python controller.py runserver 0.0.0.0:${uiPort} --noreload & wait $!`,
        ],
        runAsInit: true,
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
    .addHealthCheck('lnd-connection', {
      ready: {
        display: i18n('LND Connection'),
        trigger: sdk.trigger.statusTrigger(60_000, {
          starting: 5_000,
          failure: 10_000,
        }),
        fn: async () => {
          const res = await appSub.exec(['python', '-c', lndCheckPy], {
            cwd: appDir,
            user: 'root',
          })
          return res.exitCode === 0
            ? { result: 'success', message: i18n('Connected to LND') }
            : {
                result: 'failure',
                message: `${i18n('LND connection failed')}: ${res.stdout.toString().trim()}`,
              }
        },
      },
      requires: ['primary'],
    })
})
