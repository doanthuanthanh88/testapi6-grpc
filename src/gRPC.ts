import { Client, loadPackageDefinition, credentials } from '@grpc/grpc-js'
import { loadSync } from '@grpc/proto-loader'
import chalk from 'chalk'
import { Validate } from 'testapi6/dist/components'
import { Operation } from 'testapi6/dist/components/doc/OpenAPI3'
import { Tag } from 'testapi6/dist/components/Tag'
import { Testcase } from 'testapi6/dist/components/Testcase'
import { context } from 'testapi6/dist/Context'

context
  .on('log:grpc:begin', (api: gRPC) => {
    if (!api.slient && !api.depends) {
      context.log(`${chalk.gray('%s')}.\t${chalk.green('%s')}\t${chalk.gray.underline('%s')}`, api.index.toString(), api.title, `(${api.package}) ${api.service}.${api.function}(?)`)
    }
  })
  .on('log:grpc:validate:done', (_api: gRPC) => {
    // Validate done
  })
  .on('log:grpc:done', (api: gRPC) => {
    if (!api.slient && !api.depends) {
      context.log(`\t${chalk[api.response?.ok ? 'green' : 'red']('↳ ' + (api.response?.ok ? 'OK' : 'FAILED'))} ${chalk.gray.italic('%s')}`, ` (${api.time.toString()}ms)`)
    }
  })
  .on('log:grpc:end', (api: gRPC) => {
    if (['details', 'response', 'request'].includes(api.debug as string)) {
      context.group('')
      api.logDetails()
      context.groupEnd()
    }
    if (api.error) {
      context.log(chalk.red(api.error.message))
      api.tc.result.failed++
    }
  })

/**
 * Create a gRPC client
 */
export class gRPC extends Tag {
  static APIs = new Array<gRPC>()
  static Clients = new Map<string, Client>()

  static Index = 0
  index = 0

  key?: any
  /** Server port */
  port?: number
  /** Server address */
  host?: string
  /** Description */
  description: string
  /** How to log for debugging */
  debug: boolean | 'curl' | 'details' | 'request' | 'response'
  /** Set timeout for the request */
  timeout: number
  /** 
   * Set data after request done
   * 
   * ```yaml
   * string: set response data to this var
   * object: set customize response to each properties in this var
   * ```
   */
  var: string | { [key: string]: any }
  /** Save response to file */
  saveTo?: string
  /** Execution time */
  time: number
  /** Expose a tag */
  '->': string
  /** Extends from a expose tag */
  '<-': string | string[]
  /** Only validate for the before step */
  depends: boolean
  /** Validate after request done */
  validate: Validate[]
  /** Generate to document */
  docs?: {
    /** Only doc these request headers */
    headers?: string[]
    /** Only doc these response headers */
    responseHeaders?: string[]
    /** Config for markdown document */
    md?: {
      /** Group API document */
      tags?: string[]
    }
    /** Config for swagger document */
    swagger?: Operation
  }

  proto: string
  package: string
  service: string
  function: string
  arg: any
  metadata?: any
  config: any

  _client: Client

  /** Response object */
  response: {
    ok: boolean
    /** Response data */
    data: any
  }
  error: any

  constructor(attrs: Partial<gRPC>) {
    super(attrs)
    if (!this.host) this.host = '0.0.0.0'
    if (!this.port) this.port = 50051
    if (!this.key) this.key = this.host + ':' + this.port
  }

  async beforeExec() {
    await super.beforeExec()
    this._client = gRPC.Clients.get(this.key)
    if (!this._client) {
      const packageDefinition = loadSync(
        Testcase.getPathFromRoot(this.proto),
        this.config || {
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true
        }
      )
      const protoDescriptor = loadPackageDefinition(packageDefinition);
      const pack = protoDescriptor[this.package];
      this._client = new pack[this.service](`${this.host}:${this.port}`, credentials.createInsecure());
      gRPC.Clients.set(this.key, this._client)
    }
  }

  async prepare() {
    await super.prepare(undefined, ['validate', 'var', 'docs'])
    if (this.validate) {
      this.validate = this.validate.filter(v => v).map(v => new Validate(v))
    }
  }

  async validates() {
    for (const v of this.validate.filter(v => v)) {
      v.slient = this.slient
      v.tc = this.tc
      await v.prepare(this)
      if (!v.disabled) {
        this.error = await v.exec()
      }
      if (this.error) {
        this.tc.result.failed++
        return
      }
    }
    this.tc.result.passed++
  }

  stop() {
    this.dispose()
  }

  async exec() {
    // Listen to force stop
    context.once('app:stop', async () => {
      await this.stop()
    })

    this.index = ++gRPC.Index
    const begin = Date.now()
    try {
      context.emit('log:grpc:begin', this)
      this.response = {
        ok: false,
        data: undefined
      }
      this.response.data = await new Promise((resolve, reject) => {
        const opts = {} as any
        if (this.timeout) {
          opts.deadline = new Date(Date.now() + this.timeout)
        }
        this._client[this.function](this.arg, opts, (err, data) => {
          if (err) {
            return reject(err)
          }
          resolve(data)
        })
      })
      this.response.ok = true
      if (this.docs) {
        this.docs = this.replaceVars(this.docs, { ...context.Vars, Vars: context.Vars, $: this, $$: this.$$, Utils: context.Utils, Result: context.Result })
      }
    } catch (err) {
      this.error = err
      this.response.ok = false
    } finally {
      this.time = Date.now() - begin
      context.emit('log:grpc:done', this)
      if (this.var) this.setVar(this.var, this.response.data)
      if (!this.error) {
        if (this.validate) {
          await this.validates()
          context.emit('log:grpc:validate:done', this)
        }
      }
      context.emit('log:grpc:end', this)
      gRPC.APIs.push(this)
    }
  }

  logDetails() {
    const space = '--------------------------------------'
    if (['details', 'request'].includes(this.debug as string)) {
      context.log(`${chalk.red('%s')}`, `(${this.package}) ${this.service}.${this.function}(?)`)
      context.log('')
    }
    if (['details', 'response'].includes(this.debug as string) && this.response) {
      const res = this.response
      context.log(chalk.green('%s'), `RESPONSE`)
      // Response data
      if (res.data) {
        context.log(chalk.gray('%s'), space)
        context.log(res.data)
      }
      context.log('')
    }
  }

  dispose() {
    this._client?.close()
    this._client = null
  }
}