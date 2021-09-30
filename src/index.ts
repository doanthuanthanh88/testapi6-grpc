export * from './gRPCServer'
export * from './gRPC'
export * from './gRPCDoc'

// import { Testcase } from 'testapi6/dist/components/Testcase'
// import { gRPC } from './gRPC'
// import { gRPCDoc } from './gRPCDoc'
// import { gRPCServer } from './gRPCServer'
// import { gRPCDoc } from './gRPCDoc'
// import { Testcase } from 'testapi6/dist/components/Testcase'

// async function main() {
//   const tc = new Testcase('.')
//   Testcase.RootDir = ''
//   tc.title = 'example'
//   tc.developer = 'doanthuanthanh88@gmail.com'
//   tc.version = '1.0.0'

//   const m = new gRPCServer()
//   m.tc = tc
//   m.init({
//     packages: {
//       user: {
//         proto: '/Users/doanthuanthanh/code/github/testapi6-grpc/src/server.proto',
//         services: {
//           RouteUser: {
//             GetUsers: {
//               code: 1,
//               data: [{ name: '${$meta.get("api-role")}--${$req.name}', age: 1 }]
//             }
//           }
//         }
//       }
//     }
//   })
//   m.prepare()
//   await m.beforeExec()
//   setTimeout(async () => {
//     const c = new gRPC()
//     c.init({
//       title: 'test request',
//       docs: {},
//       debug: 'details',
//       proto: '/Users/doanthuanthanh/code/github/testapi6-grpc/src/server.proto',
//       timeout: 1000,
//       package: 'user',
//       service: 'RouteUser',
//       method: 'GetUsers',
//       metadata: {
//         'api-role': 'service',
//         'api-key': '123123'
//       },
//       request: {
//         name: 'thanh'
//       }
//     })
//     c.tc = tc
//     await c.prepare()
//     await c.beforeExec()
//     await c.exec()

//     const doc = new gRPCDoc()
//     doc.tc = tc
//     doc.init({
//       saveTo: 'doc.md'
//     })
//     doc.tc = tc
//     await doc.prepare()
//     await doc.exec()
//   }, 1000)
//   await m.exec()
// }

// setTimeout(() => {
//   main()
// }, 1000)