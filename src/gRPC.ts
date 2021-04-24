import { loadPackageDefinition, credentials, Metadata } from '@grpc/grpc-js'
import { ServiceClient } from '@grpc/grpc-js/build/src/make-client'
import { loadSync } from '@grpc/proto-loader'
import chalk from 'chalk'
import { Validate } from 'testapi6/dist/components'
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
      context.log(`\t${chalk[api.output?.ok ? 'green' : 'red']('↳ ' + (api.output?.ok ? 'OK' : 'FAILED'))} ${chalk.gray.italic('%s')}`, ` (${api.time.toString()}ms)`)
    }
  })
  .on('log:grpc:end', (api: gRPC) => {
    if (['details', 'output', 'input'].includes(api.debug as string)) {
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
  static Clients = new Map<string, ServiceClient>()

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
  debug: 'details' | 'input' | 'output'
  /** Set timeout for the call */
  timeout: number
  /** 
   * Set data after call done
   * 
   * ```yaml
   * string: set output data to this var
   * object: set customize output to each properties in this var
   * ```
   */
  var: string | { [key: string]: any }
  /** Save output to file */
  saveTo?: string
  /** Execution time */
  time: number
  /** Expose a tag */
  '->': string
  /** Extends from a expose tag */
  '<-': string | string[]
  /** Only validate for the before step */
  depends: boolean
  /** Validate after call done */
  validate: Validate[]
  /** Generate to document */
  docs?: {
    md?: {
      /** Group API document */
      tags?: string[]
    }
  }

  proto: string
  package: string
  service: string
  function: string
  input: any
  metadata?: any
  config: any

  _client: ServiceClient

  /** Wrapper result data */
  output: {
    /** Call status */
    ok: boolean
    /** Result which is returned after call done */
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
      this.output = {
        ok: false,
        data: undefined
      }
      this.output.data = await new Promise((resolve, reject) => {
        const opts = {} as any
        if (this.timeout) {
          opts.deadline = new Date(Date.now() + this.timeout)
        }
        if (this.metadata) {
          opts.credentials = credentials.createFromMetadataGenerator((_params, callback) => {
            const meta = new Metadata();
            for (let k in this.metadata) {
              meta.add(k, this.metadata[k]);
            }
            callback(null, meta);
          })
        }
        this._client[this.function](this.input, opts, (err, data) => {
          if (err) {
            return reject(err)
          }
          resolve(data)
        })
      })
      this.output.ok = true
      if (this.docs) {
        this.docs = this.replaceVars(this.docs, { ...context.Vars, Vars: context.Vars, $: this, $$: this.$$, Utils: context.Utils, Result: context.Result })
      }
    } catch (err) {
      this.error = err
      this.output.ok = false
    } finally {
      this.time = Date.now() - begin
      context.emit('log:grpc:done', this)
      if (this.var) this.setVar(this.var, this.output.data)
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
    if (['details', 'input'].includes(this.debug as string)) {
      context.log(`${chalk.red('%s')}`, `(${this.package}) ${this.service}.${this.function}(?)`)
      context.log('')
      // Input metadata
      const metadata = Object.keys(this.metadata)
      if (metadata.length) {
        context.group(chalk.gray('Metadata'), chalk.gray('---------------------'))
        context.log('')
        metadata.forEach(k => context.log(chalk.italic(`• ${k}: ${this.metadata[k]}`)))
        context.groupEnd()
        context.log('')
      }
      // Input data
      if (this.input) {
        context.group(chalk.gray('Input'), chalk.gray('---------------------'))
        context.log('')
        context.log(this.input)
        context.groupEnd()
        context.log('')
      }
    }
    if (['details', 'output'].includes(this.debug as string) && this.output) {
      const res = this.output
      context.group(chalk.gray('Output'), chalk.gray('---------------------'))
      // Output data
      if (res.data) {
        context.log('')
        context.log(res.data)
      }
      context.groupEnd()
      context.log('')
    }
  }

  dispose() {
    this._client?.close()
    this._client = null
  }
}