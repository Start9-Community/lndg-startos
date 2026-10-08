import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

export const current = VersionInfo.of({
  version: '1.11.1:1',
  releaseNotes: {
    en_US: `Updates LNDg to 1.11.1. You stay logged in when LNDg restarts or updates, a new health check shows whether LNDg can reach LND, and LNDg's own Logs page works.

- The unused network interface left behind by the StartOS 0.3.5 version of this package is removed and its port freed. A domain or .onion address you had added to it no longer reaches LNDg; add one to the Web UI interface instead.
- Reset Admin Credentials asks for confirmation before replacing the existing password.`,
    es_ES: `Actualiza LNDg a 1.11.1. Tu sesión se mantiene cuando LNDg se reinicia o se actualiza, una nueva comprobación de estado muestra si LNDg puede conectar con LND, y la página de registros de LNDg funciona.

- Se elimina la interfaz de red sin uso que dejó la versión de este paquete para StartOS 0.3.5 y se libera su puerto. Un dominio o una dirección .onion que le hubieras añadido ya no lleva a LNDg; añade uno a la interfaz «Interfaz web» en su lugar.
- «Restablecer credenciales de administrador» pide confirmación antes de reemplazar la contraseña existente.`,
    de_DE: `Aktualisiert LNDg auf 1.11.1. Du bleibst angemeldet, wenn LNDg neu startet oder aktualisiert wird, eine neue Zustandsprüfung zeigt, ob LNDg LND erreicht, und die Log-Seite von LNDg funktioniert.

- Die ungenutzte Netzwerkschnittstelle, die die StartOS-0.3.5-Version dieses Pakets hinterlassen hatte, wird entfernt und ihr Port freigegeben. Eine Domain oder .onion-Adresse, die du ihr hinzugefügt hattest, führt nicht mehr zu LNDg; füge stattdessen eine zur Schnittstelle „Weboberfläche“ hinzu.
- „Admin-Zugangsdaten zurücksetzen“ fragt nach einer Bestätigung, bevor das bestehende Passwort ersetzt wird.`,
    pl_PL: `Aktualizuje LNDg do wersji 1.11.1. Pozostajesz zalogowany, gdy LNDg uruchamia się ponownie lub aktualizuje, nowy test stanu pokazuje, czy LNDg ma połączenie z LND, a strona logów LNDg działa.

- Nieużywany interfejs sieciowy pozostawiony przez wersję tego pakietu dla StartOS 0.3.5 zostaje usunięty, a jego port zwolniony. Domena lub adres .onion dodany do niego nie prowadzi już do LNDg; zamiast tego dodaj go do interfejsu „Interfejs webowy”.
- „Zresetuj dane administratora” prosi o potwierdzenie przed zastąpieniem istniejącego hasła.`,
    fr_FR: `Met à jour LNDg vers la version 1.11.1. Vous restez connecté lorsque LNDg redémarre ou se met à jour, un nouveau contrôle d'état indique si LNDg peut joindre LND, et la page des journaux de LNDg fonctionne.

- L'interface réseau inutilisée laissée par la version de ce paquet pour StartOS 0.3.5 est supprimée et son port libéré. Un domaine ou une adresse .onion que vous lui aviez ajouté ne mène plus à LNDg ; ajoutez-en un à l'interface « Interface web » à la place.
- « Réinitialiser les identifiants administrateur » demande une confirmation avant de remplacer le mot de passe existant.`,
  },
  migrations: {
    up: async ({ effects }) => {
      await sdk.MultiHost.of(effects, 'main').retire()
    },
    down: IMPOSSIBLE,
  },
})
