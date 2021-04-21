import { Server, ServerCredentials, loadPackageDefinition } from '@grpc/grpc-js'
import { loadSync } from '@grpc/proto-loader'
import chalk from 'chalk'
import { Tag } from 'testapi6/dist/components/Tag'
import { context } from 'testapi6/dist/Context'
import { Input } from 'testapi6/dist/components'
import { Testcase } from 'testapi6/dist/components/Testcase'

/**
 * Create a gRPC server
 */
export class gRPCServer extends Tag {
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
          /** FunctionName: ResponseData */
          [functionName: string]: any
        }
      }
    }
  }

  _server: Server

  constructor(attrs: Partial<gRPCServer>) {
    super(attrs)
    if (!this.packages) this.packages = {}
    if (!this.host) this.host = '0.0.0.0'
    if (!this.port) this.port = 50051
  }

  async beforeExec() {
    await super.beforeExec()

    this._server = new Server()
    for (const packageName in this.packages) {
      const packageConfig = this.packages[packageName]
      // Suggested options for similarity to existing grpc.load behavior
      const packageDefinition = loadSync(
        Testcase.getPathFromRoot(packageConfig.proto),
        packageConfig.config || {
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true
        }
      )
      const protoDescriptor = loadPackageDefinition(packageDefinition);
      const pack = protoDescriptor[packageName];
      for (const serviceName in packageConfig.services) {
        const service = packageConfig.services[serviceName]
        this._server.addService(pack[serviceName].service, Object.keys(service).reduce((sum: any, funcName: string) => {
          context.log(chalk.green(`- (${packageName}) ${serviceName}.${funcName}(?)`))
          sum[funcName] = (ctx) => {
            ctx.call.sendUnaryMessage(null, service[funcName])
          }
          return sum
        }, {}))
      }
    }
  }

  async exec() {
    if (!this.slient && this.title) this.context.group(chalk.green('%s'), this.title)
    try {
      context.log(chalk.green('gRPC is listening at %s:%d'), this.host, this.port)
      this._server.bindAsync(`${this.host}:${this.port}`, ServerCredentials.createInsecure(), () => {
        this._server.start();
      })

      return new Promise(async (resolve) => {
        // Listen to force stop
        context.once('app:stop', async () => {
          this._server.forceShutdown()
          resolve(undefined)
        })

        const inp = new Input({
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