import database from '../lib/database.js'
import request from 'supertest'
import { expect } from 'chai'
import app from '../app.js'

const headers ={
  'user-agent': 'kubo/0.29.0/',
  'content-length': '626',
  'accept-encoding': 'gzip'
}

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
          '/ip4/0.0.0.0/tcp/4001',
          '/ip6/::/tcp/4001',
          '/ip4/0.0.0.0/udp/4001/quic-v1',
          '/ip4/0.0.0.0/udp/4001/quic-v1/webtransport',
          '/ip6/::/udp/4001/quic-v1',
          '/ip6/::/udp/4001/quic-v1/webtransport'
        ]
      }
    }
  ]
}

describe('/routing/v1/providers/', () => {
  before(() => {
    database.memory()
  })

  describe('PUT', () => {
    it('should return status 200', async () => {
      const res = await request(app)
        .put('/routing/v1/providers/')
        .set(headers)
        .send(body)

      expect(res.status).to.equal(200)
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

   it('database should have provider', async () => {
      const providers = await database.getProviders()
      expect(providers.length).to.equal(1)
      console.log({providers})
    })
  })
})
