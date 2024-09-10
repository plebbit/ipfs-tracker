import database from '../../lib/database.js'
import { expect } from 'chai'

describe('database', () => {
  before(() => {
    database.memory()
    database.clear()
  })
  afterEach(() => {
    database.clear()
  })

  describe('addCidProvidersToDatabase', () => {
    it('addCidProvidersToDatabase concurrent calls should not miss providers', async () => {
      const cid = 'cid1'
      const providers1 = [{Schema: 'bitswap', Protocol: 'transport-bitswap', Payload: {ID: '1', Addrs: ['/ip4/0.0.0.0/tcp/4001']}}]
      const providers2 = [{Schema: 'bitswap', Protocol: 'transport-bitswap', Payload: {ID: '2', Addrs: ['/ip4/0.0.0.0/tcp/4001']}}]
      const providers3 = [{Schema: 'bitswap', Protocol: 'transport-bitswap', Payload: {ID: '3', Addrs: ['/ip4/0.0.0.0/tcp/4001']}}]
      const providers4 = [{Schema: 'bitswap', Protocol: 'transport-bitswap', Payload: {ID: '4', Addrs: ['/ip4/0.0.0.0/tcp/4001']}}]
      const providers5 = [{Schema: 'bitswap', Protocol: 'transport-bitswap', Payload: {ID: '5', Addrs: ['/ip4/0.0.0.0/tcp/4001']}}]

      const promises = [
        database._private.addCidProvidersToDatabase(cid, providers1),
        database._private.addCidProvidersToDatabase(cid, providers2),
        database._private.addCidProvidersToDatabase(cid, providers3),
        database._private.addCidProvidersToDatabase(cid, providers4),
        database._private.addCidProvidersToDatabase(cid, providers5)
      ]
      await Promise.all(promises)

      const {providers} = await database.getProviders(cid)
      const peerIds = providers.map(provider => provider.ID)
      expect(peerIds.includes(providers1[0].Payload.ID)).to.equal(true)
      expect(peerIds.includes(providers2[0].Payload.ID)).to.equal(true)
      expect(peerIds.includes(providers3[0].Payload.ID)).to.equal(true)
      expect(peerIds.includes(providers4[0].Payload.ID)).to.equal(true)
      expect(peerIds.includes(providers5[0].Payload.ID)).to.equal(true)
    })
  })

  describe('getProviders', () => {
    const cid = 'cid1'
    let res
    before(async () => {
      let count = 200
      const providersToAdd = []
      while (count--) {
        providersToAdd.push([{Schema: 'bitswap', Protocol: 'transport-bitswap', Payload: {ID: String(providersToAdd.length + 1), Addrs: ['/ip4/0.0.0.0/tcp/4001']}}])
      }
      // add all providers
      for (const provider of providersToAdd) {
        await database._private.addCidProvidersToDatabase(cid, provider)
      }
      res = await database.getProviders(cid)
    })
    it('should not return more than 100 providers', async () => {
      expect(res.providers.length).to.equal(100)
    })
    it('should be sorted by lastModified', async () => {
      expect(Number(res.providers[0].ID)).to.be.greaterThan(Number(res.providers[99].ID))
    })
  })
})
