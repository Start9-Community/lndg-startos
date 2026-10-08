import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'lndg',
  title: 'LNDg',
  license: 'MIT',
  packageRepo: 'https://github.com/Start9-Community/lndg-startos',
  upstreamRepo: 'https://github.com/cryptosharks131/lndg',
  marketingUrl: 'https://x.com/cryptosharks131',
  donationUrl: null,
  description: { short, long },
  volumes: ['main'],
  images: {
    lndg: {
      source: { dockerTag: 'ghcr.io/cryptosharks131/lndg:v1.11.1' },
      arch: ['x86_64', 'aarch64'],
      emulateMissing: false,
    },
  },
})
