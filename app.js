import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import { fileURLToPath } from 'url'
import indexRouter from './routes/index.js'
import providersRouter from './routes/providers.js'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

import { inspect } from 'node:util'
inspect.defaultOptions.depth = null

const app = express()
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By')
  next()
})
app.use(logger('dev'))
app.use(express.json({limit: '1mb'}))
// app.use(express.urlencoded({ extended: false }))
// app.use(cookieParser())
// app.use(express.static(path.join(__dirname, 'public')))

app.use('/', indexRouter)
app.use('/routing/v1/providers/', providersRouter)

export default app
