import request from 'supertest'
import { expect } from 'chai'
import app from '../app.js'

describe('/', () => {
  describe('GET', () => {
    it('should welcome', async () => {
      const res = await request(app).get('/')
      expect(res.status).to.equal(200)
      expect(res.text).to.equal('Welcome to an IPFS tracker.')
    })
  })
})
