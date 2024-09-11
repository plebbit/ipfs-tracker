import { inspect } from 'node:util'
inspect.defaultOptions.depth = null

import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import { fileURLToPath } from 'url'
import indexRouter from './routes/index.js'
import providersRouter from './routes/providers.js'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

// remove x-powered-by: express
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By')
  next()
})

// trust x-forwarded-for, the app will almost always use a proxu
app.set('trust proxy', true)

app.use(logger('dev'))
app.use(express.json({
  limit: '1mb',
  // TODO: kubo doesn't always include content-type header, remove after delegated routing spec
  type: (req) => req.method === 'POST' || req.method === 'PUT'
}))
// app.use(express.urlencoded({ extended: false }))
// app.use(cookieParser())
// app.use(express.static(path.join(__dirname, 'public')))

app.use('/', indexRouter)
app.use('/routing/v1/providers/', providersRouter)

export default app
