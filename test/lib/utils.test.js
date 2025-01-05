import {normalizeCid} from '../../lib/utils.js'
import {expect} from 'chai'

describe('utils', () => {
  describe('normalizeCid', () => {
    const cidV0DagPbCodecBase58 = 'QmUMqvMcHSFxxDn6sXVhfU641HQtp6WRv84Zez5TDPeGko'
    const cidV1DagPbCodecBase32 = 'bafybeiczorqqam64xocjjjq2vg7eixz6deyex5xbzehuurj45626rtljga'
    const cidV1RawCodecBase32 = 'bafkreiczorqqam64xocjjjq2vg7eixz6deyex5xbzehuurj45626rtljga'
    const normalized = cidV1DagPbCodecBase32

    it('cid v0 dag-pb codec base58 (Qm...)', async () => {
      expect(normalizeCid(cidV0DagPbCodecBase58)).to.equal(normalized)
    })

    it('cid v1 dag-pb base32 (bafybei...)', async () => {
      expect(normalizeCid(cidV1DagPbCodecBase32)).to.equal(normalized)
    })

    it('cid v1 raw codec base32 (bafkrei...)', async () => {
      expect(normalizeCid(cidV1RawCodecBase32)).to.equal(normalized)
    })
  })
})
