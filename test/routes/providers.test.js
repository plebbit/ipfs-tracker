import database from '../../lib/database.js'
import request from 'supertest'
import { expect } from 'chai'
import app from '../../app.js'

const mockIp = '123.123.123.123'

const body = {
  Providers: [
    {
      Schema: 'bitswap',
      Protocol: 'transport-bitswap',
      Signature: 'mx5kamm5kzxuCnVJtX3K9DEj8gKlFqXil2x/M8zDTozvzowTY6W+HOALQ2LCkTZCEz4H5qizpnHxPM/rVQ7MNBg',
      Payload: {
        Keys: [
          'bafkreigur6gzxm3ykiol7ywou3iy3obruzs2q7boizj7oznznid34dzc3e',
          'bafkreigur6gzxm3ykiol7ywou3iy3obruzs2q7boizj7oznznid34dzc3e'
        ],
        Timestamp: 1725833163372,
        AdvisoryTTL: 86400000000000,
        ID: '12D3KooWEdCRaQTjjgbtBoSMhnguznp7GHhsin8eRDEtgEso6Z1B',
        Addrs: [
          `/ip4/${mockIp}/tcp/4001`,
          `/ip4/${mockIp}/udp/4001/quic-v1`,
          `/ip4/${mockIp}/udp/4001/quic-v1/webtransport`,
        ]
      }
    }
  ]
}

const getHeaders = (body) => {
  const headers ={
    'user-agent': 'kubo/0.29.0/',
    'accept-encoding': 'gzip',
    // used to mock ip address
    'x-forwarded-for': mockIp
  }
  if (body) {
    headers['content-length'] = JSON.stringify(body).length
  }
  return headers
}

describe('routes providers', () => {
  before(() => {
    database.memory()
    database.clear()
  })
  after(() => {
    database.clear()
  })

  describe('PUT /routing/v1/providers/', () => {
    let res
    before(async () => {
      res = await request(app)
        .put('/routing/v1/providers/')
        .set(getHeaders(body))
        .send(JSON.stringify(body)) // if stringify, won't add content-type header, like kubo
    })
    after(() => {
      database.clear()
    })
    it('should return status 200', async () => {
      expect(res.status).to.equal(200)
    })
    it('body should contain result', async () => {
      expect(res.body).to.deep.equal({
        ProvideResults: [
          {
            Schema: 'bitswap',
            Protocol: 'transport-bitswap',
            AdvisoryTTL: 86400000000000
          }
        ]
      })
    })
    it('should have content-type header', async () => {
      expect(res.headers['content-type'].includes('json')).to.equal(true)
    })
    it('database should have provider', async () => {
      const {providers} = await database.getProviders(body.Providers[0].Payload.Keys[0])
      expect(providers.length).to.equal(1)
    })
  })

  describe('PUT /routing/v1/providers/ with non rep.iq ip addresses', () => {
    let res
    const badIps = [
      // local ips
      `/ip4/0.0.0.0/tcp/4001`,
      `/ip4/127.0.0.1/tcp/4001`,
      // public but different from req.iq
      `/ip4/8.8.8.8/tcp/4001`,
      `/ip4/9.9.9.9/tcp/4001`,
    ]
    const bodyWithBadIps = JSON.parse(JSON.stringify(body))
    bodyWithBadIps.Providers[0].Payload.Addrs.push(...badIps)
    before(async () => {
      res = await request(app)
        .put('/routing/v1/providers/')
        .set(getHeaders(bodyWithBadIps))
        .send(bodyWithBadIps)
    })
    after(() => {
      database.clear()
    })
    it('should return status 200', async () => {
      expect(res.status).to.equal(200)
    })
    it('database should have provider but not with bad ips', async () => {
      const {providers} = await database.getProviders(body.Providers[0].Payload.Keys[0])
      expect(providers.length).to.equal(1)
      expect(providers[0].Addrs.length).to.be.greaterThan(0)
      expect(providers[0].Addrs.length).to.equal(body.Providers[0].Payload.Addrs.length)
      for (const badIp of badIps) {
        expect(providers[0].Addrs.includes(badIp)).to.equal(false)
      }
    })
  })

  describe('GET /routing/v1/providers/ has providers', () => {
    let res
    before(async () => {
      await request(app)
        .put('/routing/v1/providers/')
        .set(getHeaders(body))
        .send(JSON.stringify(body)) // if stringify, won't add content-type header, like kubo

      res = await request(app)
        .get(`/routing/v1/providers/${body.Providers[0].Payload.Keys[0]}`)
        .set(getHeaders())
    })
    after(() => {
      database.clear()
    })
    it('should return status 200', async () => {
      expect(res.status).to.equal(200)
    })
    it('should have last-modified header', async () => {
      expect(typeof res.headers['last-modified']).to.equal('string')
    })
    it('should have content-type header', async () => {
      expect(res.headers['content-type'].includes('json')).to.equal(true)
    })
    it('should have cache-control header', async () => {
      expect(res.headers['content-type'].includes('json')).to.equal(true)
    })
    it('should contain provider', async () => {
      expect(res.body.Providers[0].Schema).to.equal('peer')
      expect(res.body.Providers[0].ID).to.equal(body.Providers[0].Payload.ID)
      expect(res.body.Providers[0].Protocols[0]).to.equal(body.Providers[0].Protocol)
      expect(res.body.Providers[0].Addrs).to.deep.equal(body.Providers[0].Payload.Addrs)
    })
  })

  describe('GET /routing/v1/providers/ does not have providers', () => {
    const unknownCid = 'bafybeigvgzoolc3drupxhlevdp2ugqcrbcsqfmcek2zxiw5wctk3xjpjwy'
    let res
    before(async () => {
      res = await request(app)
        .get(`/routing/v1/providers/${unknownCid}`)
        .set(getHeaders())
    })
    it('should return status 404', async () => {
      expect(res.status).to.equal(404)
    })
    it('should not have last-modified header', async () => {
      expect(res.headers['last-modified']).to.equal(undefined)
    })
    it('should have content-type header', async () => {
      expect(res.headers['content-type'].includes('json')).to.equal(true)
    })
    it('should have cache-control header', async () => {
      expect(res.headers['content-type'].includes('json')).to.equal(true)
    })
    it('should contain no providers', async () => {
      expect(res.body.Providers.length).to.equal(0)
    })
  })
})
