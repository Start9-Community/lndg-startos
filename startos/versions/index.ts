import { VersionGraph } from '@start9labs/start-sdk'
import { current } from './current'
import { v_1_11_1_1 } from './v1.11.1_1'
import { v_1_10_1_5 } from './v1.10.1_5'

export const versionGraph = VersionGraph.of({
  current,
  other: [v_1_11_1_1, v_1_10_1_5],
})
