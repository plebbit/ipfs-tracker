import Keyv from 'keyv'
import KeyvSqlite from '@keyv/sqlite'
import KeyvGzip from '@keyv/compress-gzip'
import fs from 'fs'
import assert from 'assert'

import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const databaseFolderPath = path.join(__dirname, '..', 'data')
const databasePath = path.join(databaseFolderPath, 'database.sqlite')

const day = 1000 * 60 * 60 * 24
let keyv

const initDatabase = async () => {
  if (keyv) {
    return
  }
  try {
    fs.mkdirSync(databaseFolderPath)
  }
  catch (e) {}

  keyv = new Keyv({
    store: new KeyvSqlite(`sqlite://${databasePath}`), 
    ttl: day, 
    compression: new KeyvGzip()
  })
}

const addProviders = async (providers) => {
  await initDatabase()

  const cids = {}
  for (const provider of providers) {
    // TODO: when deletated routing post spec is finalized, verify signature here

    for (const key of provider.Payload.Keys) {
      if (!cids[key]) {
        cids[key] = []
      }
      cids[key].push(provider)
    }
  }

  // add providers to db for each cid
  const promises = []
  for (const cid in cids) {
    promises.push(addCidProvidersToDatabase(cid, cids[cid])) 
  }
  await Promise.all(promises)
}

const addCidProvidersToDatabasePending = {}
const addCidProvidersToDatabase = async (cid, newProviders) => {
  assert(cid && typeof cid === 'string', `database.addCidProvidersToDatabase cid '${cid}' not a string`)
  assert(Array.isArray(newProviders), `database.addCidProvidersToDatabase cid '${cid}' newProviders '${newProviders}' not an array`)

  // don't update the same cid at the same time or could lose data
  while (addCidProvidersToDatabasePending[cid]) {
    await new Promise(r => setTimeout(r, 5))
  }
  addCidProvidersToDatabasePending[cid] = true

  const {providers: nextProviders} = await keyv.get(cid) || {providers: {}}
  for (const newProvider of newProviders) {
    nextProviders[newProvider.Payload.ID] = {
      provider: {
        Schema: 'peer',
        Addrs: newProvider.Payload.Addrs,
        ID: newProvider.Payload.ID,
        Protocols: [newProvider.Protocol]
      },
      lastModified: Date.now()
    }
  }
  const nextValue = {
    providers: nextProviders,
    lastModified: Date.now()
  }
  await keyv.set(cid, nextValue)

  delete addCidProvidersToDatabasePending[cid]
}

const getProviders = async (cid) => {
  assert(cid && typeof cid === 'string', `database.getProviders cid '${cid}' not a string`)
  await initDatabase()

  const {providers: providersObject, lastModified} = await keyv.get(cid) || {providers: {}}

  let providers = Object.values(providersObject)
  // sort by last modified
  providers = providers.sort((a, b) =>  b.lastModified - a.lastModified)
  // remove non provider props
  providers = providers.map(provider => provider.provider)
  // only return 100 in non streaming response
  if (providers.length > 100) {
    providers.length = 100
  }

  return {
    providers,
    lastModified
  }
}

const database = {
  // public
  addProviders,
  getProviders,

  // for testing
  clear: () => keyv.clear(),
  memory: () => {
    keyv = new Keyv({
      store: new KeyvSqlite('sqlite://:memory:'), 
      ttl: day
    })
  },

  // private
  _private: {
    addCidProvidersToDatabase
  }
}

export default database
