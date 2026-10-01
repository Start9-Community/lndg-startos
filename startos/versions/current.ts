import { VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.10.1:10',
  releaseNotes: {
    en_US: `LNDg keeps running when the server's network addresses change, and stops without delay.`,
    es_ES: `LNDg sigue funcionando cuando cambian las direcciones de red del servidor y se detiene sin demora.`,
    de_DE: `LNDg läuft weiter, wenn sich die Netzwerkadressen des Servers ändern, und wird ohne Verzögerung beendet.`,
    pl_PL: `LNDg działa dalej, gdy zmieniają się adresy sieciowe serwera, i zatrzymuje się bez opóźnienia.`,
    fr_FR: `LNDg continue de fonctionner lorsque les adresses réseau du serveur changent, et s'arrête sans délai.`,
  },
  migrations: {},
})
