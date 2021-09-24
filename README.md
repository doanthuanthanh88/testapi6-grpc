# testapi6-grpc
Execute grpc command

# Features
- Create a gRPC server to mock data
- Provide gRPC client to call to another
- Export to gRPC document

> Read [document details](./docs/modules.html)

# How to use
### Installation
```javascript
// install via npm
npm install -g testapi6-grpc

// install via yarn
yarn global add testapi6-grpc
```

### Use in yaml
- File `/testapi6-grpc/src/server.proto`
```proto
  syntax = "proto3";

  package user;

  import "google/protobuf/empty.proto";

  service RouteUser {
    rpc GetUsers(google.protobuf.Empty) returns (ResponseUser);
  }

  message ResponseUser {
    optional int32 code = 1;
    repeated User data = 2;
  }

  message User {
    string name = 1;
    int32 age = 2;
  }

```
```yaml
- testapi6-grpc.gRPCServer:
    packages:
      user:
        proto: /testapi6-grpc/src/server.proto
        services:
          RouteUser:
            GetUsers: {
              code: 1,
              data: [{name: 'thanh', age: 1}]
            }
- testapi6-grpc.gRPC:
    title: Test call to a gRPC server
    proto: /testapi6-grpc/src/server.proto
    package: user
    service: RouteUser
    function: GetUsers
    input: null
    timeout: 1000
    debug: details
    validate:
      - title: Check something
        func: length
        args:
          - ${$.response.data}
          - 1
- testapi6-grpc.gRPCDoc:
    title: Document the gRPC calls
    saveTo: doc.md
```