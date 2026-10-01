import { utils } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

export const seedFiles = sdk.setupOnInit(async (effects) => {
  // Ensure store.json exists with schema defaults so `read().once()` returns
  // a populated shape on every kind (install/restore). The admin password is
  // intentionally NOT seeded here — its absence is what triggers the critical
  // task in taskSetAdminCredentials, prompting the user to create the
  // credentials on first run (mirrors lightning-terminal-startos).
  await storeJson.merge(
    effects,
    (await storeJson.read((s) => s.secretKey).once())
      ? {}
      : {
          secretKey: utils.getDefaultString({
            charset: 'a-z,A-Z,0-9',
            len: 64,
          }),
        },
  )
})
