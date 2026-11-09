import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.11.1:4',
  releaseNotes: {
    en_US:
      'Requires StartOS 0.4.1 or later. LNDg now reads only the credential it needs from LND, and can no longer read its seed or other files. The LND database size is no longer shown. Requires LND 0.21.6-beta:3 or later.',
    es_ES:
      'Requiere StartOS 0.4.1 o posterior. LNDg ahora lee de LND solo la credencial que necesita y ya no puede leer su semilla ni otros archivos. Ya no se muestra el tamaño de la base de datos de LND. Requiere LND 0.21.6-beta:3 o posterior.',
    de_DE:
      'Erfordert StartOS 0.4.1 oder neuer. LNDg liest von LND nur noch die Zugangsdaten, die es braucht, und kann dessen Seed und andere Dateien nicht mehr lesen. Die Größe der LND-Datenbank wird nicht mehr angezeigt. Erfordert LND 0.21.6-beta:3 oder neuer.',
    pl_PL:
      'Wymaga StartOS 0.4.1 lub nowszego. LNDg odczytuje teraz z LND tylko potrzebne mu poświadczenie i nie może już odczytać jego seeda ani innych plików. Rozmiar bazy danych LND nie jest już wyświetlany. Wymaga LND 0.21.6-beta:3 lub nowszego.',
    fr_FR:
      "Nécessite StartOS 0.4.1 ou une version ultérieure. LNDg ne lit désormais que l'identifiant dont il a besoin dans LND et ne peut plus lire sa seed ni ses autres fichiers. La taille de la base de données de LND n'est plus affichée. Nécessite LND 0.21.6-beta:3 ou une version ultérieure.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
