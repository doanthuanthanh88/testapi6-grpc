export * from './gRPCServer'
export * from './gRPC'

// import { gRPC } from './gRPC'
// import { gRPCServer } from './gRPCServer'

// async function main() {
//   const m = new gRPCServer({
//     packages: {
//       user: {
//         proto: '/Users/doanthuanthanh/code/github/testapi6-grpc/src/server.proto',
//         services: {
//           RouteUser: {
//             GetUsers: {
//               code: 1,
//               data: [{name: 'thanh', age: 1}]
//             }
//           }
//         }
//       }
//     }
//   })
//   m.prepare()
//   await m.beforeExec()
//   setInterval(async () => {
//     const c = new gRPC({
//       title: 'test request',
//       proto: '/Users/doanthuanthanh/code/github/testapi6-grpc/src/server.proto',
//       timeout: 1000,
//       package: 'user',
//       service: 'RouteUser',
//       function: 'GetUsers',
//       arg: null
//     })
//     await c.prepare()
//     await c.beforeExec()
//     await c.exec()
//     // console.log(c.response)
//   }, 1000)
//   await m.exec()
// }

// main()