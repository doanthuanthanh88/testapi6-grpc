# example
__


> Version `1.0.0`
> [Contact doanthuanthanh88](mailto:doanthuanthanh88@gmail.com)
> Last updated: `Sat Apr 24 2021 11:02:51 GMT+0700 (Indochina Time)`

## APIs

|No.  | API Description | API Function |
|---: | ---- | ---- |
|  | __default__ - _1 items_ |  |
|1.| [**test request**](#1) | `/user/RouteUser.GetUsers(?)` |
## Servers
## Details
### **test request**

`/user/RouteUser.GetUsers(?)`

#### Metadata
- `api-role`: *service*
- `api-key`: *123123*
#### Input
```json
{
  "name": "thanh"
}
```
#### Output
```json
{
  "data": [
    {
      "name": "service",
      "age": 1
    }
  ],
  "code": 1
}
```