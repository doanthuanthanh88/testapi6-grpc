import { loadPackageDefinition, Server, ServerCredentials } from '@grpc/grpc-js'
import { loadSync } from '@grpc/proto-loader'
import chalk from 'chalk'
import { merge } from 'lodash'
import { Input } from 'testapi6/dist/components/input/Input'
import { replaceVars, Tag } from 'testapi6/dist/components/Tag'
import { Testcase } from 'testapi6/dist/components/Testcase'

/**
 * Create a gRPC server
 */
export class gRPCServer extends Tag {
  static get des() {
    return `Create a gRPC server to mock data`
  }
  static get example() {
    return `- testapi6-grpc.gRPCServer:
    packages:
      user:
        proto: /testapi6-grpc/src/server.proto
        services:
          ServiceName1:
            RPCMethodName: {
              des: Response data here
              code: 1,
              data: [{name: 'thanh', age: 1}]
            }
          ServiceName2:
            RPCMethodNameFunction: |
              (call) => {
                return {
                  des: Response data here
                  code: 1,
                  data: [{name: 'thanh', age: 1}]
                }
              }
`
  }
  /** Server port */
  port?: number
  /** Server address */
  host?: string
  /** Package definitions */
  packages: {
    [name: string]: {
      proto: string
      config?: any
      services: {
        [serviceName: string]: {
          /** FunctionName: Output */
          [functionName: string]: any
        }
      }
    }
  }

  _server: Server

  init(attrs: Partial<gRPCServer>) {
    super.init(attrs)
    if (!this.packages) this.packages = {}
    if (!this.host) this.host = '0.0.0.0'
    if (!this.port) this.port = 50051
  }

  prepare(scope?: any) {
    return super.prepare(scope, ['packages'])
  }

  async beforeExec() {
    await super.beforeExec()
    const self = this
    this._server = new Server()
    for (const packageName in this.packages) {
      const packageConfig = this.packages[packageName]
      // Suggested options for similarity to existing grpc.load behavior
      packageConfig.proto = Testcase.getPathFromRoot(packageConfig.proto)
      if (packageConfig.config?.includeDirs) {
        packageConfig.config.includeDirs = packageConfig.config.includeDirs.map(e => Testcase.getPathFromRoot(e))
      }
      const packageDefinition = loadSync(
        packageConfig.proto,
        merge({
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true
        }, packageConfig.config || {})
      )
      const protoDescriptor = loadPackageDefinition(packageDefinition);
      const pack = protoDescriptor[packageName];
      this.context.group(chalk.green('gRPC endpoints:'))

      for (const serviceName in packageConfig.services) {
        const service = packageConfig.services[serviceName]
        this._server.addService(pack[serviceName].service, Object.keys(service).reduce((sum: any, funcName: string) => {
          this.context.log(chalk.green(`- /${packageName}/${serviceName}.${funcName}(?)`))
          sum[funcName] = async (ctx) => {
            let data = service[funcName]
            if (typeof data === 'function') {
              data = await data(ctx, self)
            }
            // @ts-ignore
            const metadata = ctx.metadata
            const request = ctx.request
            const rs = replaceVars(data, { $metadata: metadata, $meta: metadata, $: self, $request: request, $req: request })
            ctx.call.sendUnaryMessage(null, rs)
          }
          return sum
        }, {}))
      }
      this.context.groupEnd()
    }
  }

  async exec() {
    if (!this.slient && this.title) this.context.group(chalk.green('%s'), this.title)
    try {
      this.context.log(chalk.green('gRPC is listening at %s:%d'), this.host, this.port)
      this._server.bindAsync(`${this.host}:${this.port}`, ServerCredentials.createInsecure(), () => {
        this._server.start();
      })

      return new Promise(async (resolve) => {
        // Listen to force stop
        this.context.once('app:stop', async () => {
          this._server.forceShutdown()
          resolve(undefined)
        })

        const inp = new Input()
        inp.init({
          title: `Enter to stop the gRPC service "${this.title || ''}" !`
        })
        inp.setup(this.tc)
        inp.prepare()
        await inp.exec()
        this._server.forceShutdown()
        resolve(undefined)
      })

    } finally {
      if (!this.slient && this.title) this.context.groupEnd()
    }
  }

  dispose() {
    this._server.forceShutdown()
  }
}