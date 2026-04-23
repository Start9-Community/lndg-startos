import { VersionInfo, IMPOSSIBLE } from '@start9labs/start-sdk'
import { rm } from 'fs/promises'

export const v_1_10_1_2 = VersionInfo.of({
  version: '1.10.1:2',
  releaseNotes: {
    en_US: 'Initial StartOS 0.4.0 port of LNDg v1.10.1',
    es_ES: 'Migración inicial de LNDg v1.10.1 a StartOS 0.4.0',
    de_DE: 'Erste StartOS 0.4.0-Portierung von LNDg v1.10.1',
    pl_PL: 'Początkowy port LNDg v1.10.1 do StartOS 0.4.0',
    fr_FR: 'Portage initial de LNDg v1.10.1 vers StartOS 0.4.0',
  },
  migrations: {
    up: async ({ effects }) => {
      // Clean up any legacy start9 directory left over from the pre-0.4 package
      await rm('/media/startos/volumes/main/start9', {
        recursive: true,
      }).catch(() => {})
    },
    down: IMPOSSIBLE,
  },
})
