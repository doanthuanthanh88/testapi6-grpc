export * from './gRPCServer'
export * from './gRPC'
export * from './gRPCDoc'

// import { gRPC } from './gRPC'
// import { gRPCServer } from './gRPCServer'
// import { gRPCDoc } from './gRPCDoc'
// import { Testcase } from 'testapi6/dist/components/Testcase'

// async function main() {
//   const m = new gRPCServer({
//     packages: {
//       user: {
//         proto: '/Users/doanthuanthanh/code/github/testapi6-grpc/src/server.proto',
//         services: {
//           RouteUser: {
//             GetUsers: {
//               code: 1,
//               data: [{ name: '${metadata.get("api-role")}', age: 1 }]
//             }
//           }
//         }
//       }
//     }
//   })
//   m.prepare()
//   await m.beforeExec()
//   setTimeout(async () => {
//     const c = new gRPC({
//       title: 'test request',
//       docs: {},
//       debug: 'details',
//       proto: '/Users/doanthuanthanh/code/github/testapi6-grpc/src/server.proto',
//       timeout: 1000,
//       package: 'user',
//       service: 'RouteUser',
//       function: 'GetUsers',
//       metadata: {
//         'api-role': 'service',
//         'api-key': '123123'
//       },
//       input: {
//         name: 'thanh'
//       }
//     })
//     await c.prepare()
//     await c.beforeExec()
//     await c.exec()

//     const tc = new Testcase('.')
//     tc.title = 'example'
//     tc.developer = 'doanthuanthanh88@gmail.com'
//     tc.version = '1.0.0'
//     const doc = new gRPCDoc({
//       saveTo: 'doc.md'
//     })
//     doc.tc = tc
//     await doc.prepare()
//     await doc.exec()
//   }, 1000)
//   await m.exec()


// }

// main()