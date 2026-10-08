import { actions } from '../actions'
import { restoreInit } from '../backups'
import { dependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { sdk } from '../sdk'
import { versionGraph } from '../versions'
import { bootstrapSettings } from './bootstrapSettings'
import { seedFiles } from './seedFiles'
import { taskSetAdminCredentials } from './taskSetAdminCredentials'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  seedFiles,
  bootstrapSettings,
  setInterfaces,
  actions,
  dependencies,
  taskSetAdminCredentials,
)

export const uninit = sdk.setupUninit(versionGraph)
