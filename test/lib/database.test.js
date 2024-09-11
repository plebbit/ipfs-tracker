import database from '../../lib/database.js'
import { expect } from 'chai'

// to restore mocks
const DateNow = Date.now

describe('database', () => {
  before(() => {
    database.memory()
    database.clear()
  })
  afterEach(() => {
    database.clear()
  })

  describe('addCidProvidersToDatabase', () => {
    afterEach(() => {
      database.clear()
    })

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

    it('addCidProvidersToDatabase should remove expired', async () => {
      const cid = 'cid1'
      const providers1 = [{Schema: 'bitswap', Protocol: 'transport-bitswap', Payload: {ID: '1', Addrs: ['/ip4/0.0.0.0/tcp/4001']}}]
      const providers2 = [{Schema: 'bitswap', Protocol: 'transport-bitswap', Payload: {ID: '2', Addrs: ['/ip4/0.0.0.0/tcp/4001']}}]
      
      await database._private.addCidProvidersToDatabase(cid, providers1)

      // mock date 10 years in the future
      const in10Years = Date.now() + 1000 * 60 * 60 * 24 * 365 * 10
      Date.now = () => in10Years

      await database._private.addCidProvidersToDatabase(cid, providers2)
      const {providers} = await database._private.providersKeyv().get(cid)
      expect(providers[providers1[0].Payload.ID]).to.equal(undefined)
      expect(providers[providers2[0].Payload.ID]).to.not.equal(undefined)
      expect(Object.keys(providers).length).to.equal(1)

      // restore mock
      Date.now = DateNow
    })
  })

  describe('getProviders', () => {
    describe('large amount of providers in db', () => {
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
    })
  })

  describe('expired providers in db', () => {
    const cid = 'cid1'
    const providers1 = [{Schema: 'bitswap', Protocol: 'transport-bitswap', Payload: {ID: '1', Addrs: ['/ip4/0.0.0.0/tcp/4001']}}]
    const providers2 = [{Schema: 'bitswap', Protocol: 'transport-bitswap', Payload: {ID: '2', Addrs: ['/ip4/0.0.0.0/tcp/4001']}}]
    let res
    before(async () => {
      await database._private.addCidProvidersToDatabase(cid, providers1)

      // mock date 10 years in the future
      const in10Years = Date.now() + 1000 * 60 * 60 * 24 * 365 * 10
      Date.now = () => in10Years

      await database._private.addCidProvidersToDatabase(cid, providers2)
      res = await database.getProviders(cid)

      // restore mock
      Date.now = DateNow
    })
    it('should not return expired providers', async () => {
      const peerIds = res.providers.map(provider => provider.ID)
      expect(peerIds.includes(providers1[0].Payload.ID)).to.equal(false)
      expect(peerIds.includes(providers2[0].Payload.ID)).to.equal(true)
      expect(res.providers.length).to.equal(1)
    })   
  })
})
