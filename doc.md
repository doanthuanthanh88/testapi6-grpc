# example

<br/>

Version: `1.0.0`  
Developer: [doanthuanthanh88](mailto:doanthuanthanh88@gmail.com)  
Last updated: `Thu Sep 30 2021 14:45:17 GMT+0700 (Indochina Time)`

<br/>


## Servers

<br/>


|     |   Title  | Function | |
|---: | ---- | ---- | ---- |
| <a name='ANCHOR_-1'></a> | __default__ - _1 items_ |
|1.| [test request](#1) | `/user/RouteUser.GetUsers(?)` | [YAML](yaml/test_request.grpc.yaml) |

<br/><br/>

## <a name='1'></a>test request


<br/>

Package &nbsp;&nbsp;&nbsp; __`user`__  
Service &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; __`RouteUser`__  
Method &nbsp;&nbsp;&nbsp; __`GetUsers`__  
<details><summary><code>server.proto</code></summary>

```proto
syntax = "proto3";

package user;

service RouteUser {
  rpc GetUsers(UserInput) returns (ResponseUser);
}

message ResponseUser {
  optional int32 code = 1;
  repeated User data = 2;
}

message UserInput {
  string name = 1;
}

message User {
  string name = 1;
  int32 age = 2;
}

```

</details>

<br/>
<details><summary>testapi6.yaml</summary>

```yaml
gRPC:
  url: 0.0.0.0:50051
  title: test request
  proto: /Users/doanthuanthanh/code/github/testapi6-grpc/src/server.proto
  package: user
  service: RouteUser
  metadata:
    api-role: service
    api-key: '123123'
  method: GetUsers
  request:
    name: thanh
  timeout: 1000
  debug: details

```

</details>

<br/>
<br/>

### Request

<details><summary>Metadata</summary>

```json
{
  "api-role": "service",
  "api-key": "123123"
}
```

</details>

```yaml
◦ api-role: !string 
◦ api-key: !string 
```

<details><summary>Request</summary>

```json
{
  "name": "thanh"
}
```

</details>

```yaml
◦ name: !string 
```


<br/>

### Response

<details><summary>Response</summary>

```json
{
  "data": [
    {
      "name": "service--thanh",
      "age": 1
    }
  ],
  "code": 1,
  "_code": "code"
}
```

</details>  

```yaml
◦ data: !array 
  ◦ name: !string 
  ◦ age: !integer 
◦ code: !integer 
◦ _code: !string 
```


<br/><br/>
