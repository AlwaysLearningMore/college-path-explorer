import raw from './seed.json'
import type { Dataset, Source } from './types'

export const dataset = raw as Dataset

const byId = new Map(dataset.sources.map((s) => [s.id, s]))
export const getSource = (id: string): Source | undefined => byId.get(id)
export * from './types'
