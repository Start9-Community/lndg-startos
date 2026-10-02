import { VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.11.1:0',
  releaseNotes: {
    en_US: `Updates LNDg to 1.11.1. You stay logged in when LNDg restarts or updates, a new health check shows whether LNDg can reach LND, and LNDg's own Logs page works.`,
    es_ES: `Actualiza LNDg a 1.11.1. Tu sesión se mantiene cuando LNDg se reinicia o se actualiza, una nueva comprobación de estado muestra si LNDg puede conectar con LND, y la página de registros de LNDg funciona.`,
    de_DE: `Aktualisiert LNDg auf 1.11.1. Du bleibst angemeldet, wenn LNDg neu startet oder aktualisiert wird, eine neue Zustandsprüfung zeigt, ob LNDg LND erreicht, und die Log-Seite von LNDg funktioniert.`,
    pl_PL: `Aktualizuje LNDg do wersji 1.11.1. Pozostajesz zalogowany, gdy LNDg uruchamia się ponownie lub aktualizuje, nowy test stanu pokazuje, czy LNDg ma połączenie z LND, a strona logów LNDg działa.`,
    fr_FR: `Met à jour LNDg vers la version 1.11.1. Vous restez connecté lorsque LNDg redémarre ou se met à jour, un nouveau contrôle d'état indique si LNDg peut joindre LND, et la page des journaux de LNDg fonctionne.`,
  },
  migrations: {},
})
