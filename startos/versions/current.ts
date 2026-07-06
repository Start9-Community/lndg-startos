import { VersionInfo, IMPOSSIBLE } from '@start9labs/start-sdk'
import { rm } from 'fs/promises'

export const current = VersionInfo.of({
  version: '1.10.1:5',
  releaseNotes: {
    en_US:
      'Internal updates (start-sdk 2.0.x). LNDg now starts without waiting for LND to be unlocked, connects automatically once LND is available, and no longer restarts when LND is updated.',
    es_ES:
      'Actualizaciones internas (start-sdk 2.0.x). LNDg ahora se inicia sin esperar a que LND esté desbloqueado, se conecta automáticamente cuando LND está disponible y ya no se reinicia cuando se actualiza LND.',
    de_DE:
      'Interne Aktualisierungen (start-sdk 2.0.x). LNDg startet jetzt, ohne auf das Entsperren von LND zu warten, verbindet sich automatisch, sobald LND verfügbar ist, und wird bei einem LND-Update nicht mehr neu gestartet.',
    pl_PL:
      'Aktualizacje wewnętrzne (start-sdk 2.0.x). LNDg uruchamia się teraz bez oczekiwania na odblokowanie LND, łączy się automatycznie, gdy LND jest dostępny, i nie uruchamia się ponownie po aktualizacji LND.',
    fr_FR:
      'Mises à jour internes (start-sdk 2.0.x). LNDg démarre désormais sans attendre le déverrouillage de LND, se connecte automatiquement dès que LND est disponible et ne redémarre plus lors d’une mise à jour de LND.',
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
