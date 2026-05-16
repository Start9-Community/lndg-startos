import { VersionInfo, IMPOSSIBLE } from '@start9labs/start-sdk'
import { rm } from 'fs/promises'

export const v_1_10_1_3 = VersionInfo.of({
  version: '1.10.1:3',
  releaseNotes: {
    en_US: `- Adds an in-app Instructions tab
- Internal updates (start-sdk 1.5.1)`,
    es_ES: `- Añade una pestaña de Instrucciones en la app
- Actualizaciones internas (start-sdk 1.5.1)`,
    de_DE: `- Fügt eine In-App-Anleitungs-Registerkarte hinzu
- Interne Aktualisierungen (start-sdk 1.5.1)`,
    pl_PL: `- Dodaje zakładkę Instrukcje w aplikacji
- Aktualizacje wewnętrzne (start-sdk 1.5.1)`,
    fr_FR: `- Ajoute un onglet Instructions dans l'application
- Mises à jour internes (start-sdk 1.5.1)`,
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
