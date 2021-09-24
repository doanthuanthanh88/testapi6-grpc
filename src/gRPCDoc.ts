import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dump } from 'js-yaml';
import { merge, pick, uniqBy } from 'lodash';
import mkdirp from 'mkdirp';
import { basename, dirname, join, relative } from 'path';
import { isGotData, schemaToMD, toJsonSchema } from 'testapi6/dist/components/doc/DocUtils';
import { OutputFile } from 'testapi6/dist/components/output/OutputFile';
import { Testcase } from 'testapi6/dist/components/Testcase';
import { gRPC } from "./gRPC";

/**
 * Export markdown document
 * ```yaml
 * - gRPCDoc:
 *     saveTo: test.md                       # Markdown ouput file
 * ```
 */
export class gRPCDoc extends OutputFile {
  static get des() {
    return `Export to gRPC document`
  }
  static get example() {
    return `- testapi6-grpc.gRPCDoc:
    title: Document the gRPC calls
    saveTo: doc.md
`
  }
  /** Only doc these metadata */
  allowMetadata?: string[]
  /** Overide swagger properties which system generated */
  raw?: {
    /** Document title */
    title: string
    /** Document description */
    description?: string
    /** Document version */
    version: string
    /** Developer */
    developer: string
    /** Endpoints in service (production, staging, development) */
    servers: { [env: string]: string }
  }

  async exec() {
    let menu = []
    const { title, description, version = '', developer = '', servers } = this.tc
    this.raw = merge({ title, description, version, developer, servers }, this.raw)
    menu.push(`# ${this.raw.title || this.tc.title || ''}`)
    const des = this.raw.description || this.tc.description
    if (des) {
      menu.push('')
      menu.push(`_${des}_  `)
    }
    menu.push('')
    menu.push('<br/>')
    menu.push('')
    menu.push(`Version: \`${this.raw.version || this.tc.version || ''}\`  `)
    if (developer) {
      menu.push(`Developer: [${developer.split('@')[0]}](mailto:${developer})  `)
    }
    menu.push(`Last updated: \`${new Date().toString()}\``)
    menu.push('')
    menu.push('<br/>')
    menu.push('')
    if (servers) {
      menu.push('')
      menu.push('## Servers')
      menu = menu.concat(Object.keys(servers).map(des => `- ${des}: ${servers[des]}`))
      menu.push('')
      menu.push('<br/>')
      menu.push('')
    }

    const details = ['', '<br/><br/>', '']
    const apis = uniqBy(gRPC.APIs.filter(api => api.docs && api.title), tag => `\`/${tag.package}/${tag.service}.${tag.function}(?)\``)
    const tags = [] as { name: string, items: gRPC[] }[]
    apis.forEach(a => {
      a.docs = merge({ md: { tags: [] }, tags: [] }, a.docs)
      if (!a.docs.md?.tags?.length && !a.docs.tags?.length) {
        a.docs.md.tags.push('default')
      }
      [...(a.docs?.md?.tags || []), ...(a.docs?.tags || [])].forEach(t => {
        let tag = tags.find(tag => tag.name === t)
        if (!tag) {
          tag = { name: t, items: [] }
          tags.push(tag)
        }
        tag.items.push(a)
      })
    })
    tags.sort((a, b) => +(a.name > b.name) > 0 ? 1 : -1)
    for (let tag of tags) {
      tag.items.sort((a, b) => +(a.title > b.title) > 0 ? 1 : -1)
    }

    const menus = []
    menus.push(`|     |   Title  | Function | |`)
    menus.push(`|---: | ---- | ---- | ---- |`)

    const saveFolder = dirname(this.saveTo)
    const yamlFolder = join(saveFolder, 'yaml')
    mkdirp.sync(yamlFolder)

    for (let tag of tags) {
      const idx = menus.length
      let len = 0

      tag.items.forEach((tag, i) => {
        const yamlFile = join(yamlFolder, Testcase.toFileName(tag.title) + '.grpc.yaml')
        writeFileSync(yamlFile, dump([
          {
            Vars: Object.keys(tag.tc.servers || {}).reduce((sum, e) => {
              sum[e] = tag.tc.servers[e]
              return sum
            }, {})
          },
          {
            gRPC: tag.toTestAPI6()
          }
        ]))

        len++
        const tagTitle = tag.docs.deprecated ? `~~${tag.title}~~` : `${tag.title}`
        menus.push(`|${i + 1}.| [${tagTitle}](#${tag.index}) | ${`\`/${tag.package}/${tag.service}.${tag.function}(?)\``} | [YAML](${relative(saveFolder, yamlFile)}) |`)
      })
      menus.splice(idx, 0, `| <a name='ANCHOR_-1'></a> | __${tag.name}__ - _${len} items_ |`)
    }
    menu.push('')


    apis.forEach((tag) => {
      const tagTitle = tag.docs.deprecated ? `~~${tag.title}~~` : `${tag.title}`
      details.push(`## <a name='${tag.index}'></a>${tagTitle}`)
      if (tag.description) {
        details.push(`_${tag.description}_`, '')
      }

      details.push((tag.docs.tags || []).map(t => `\`(${t})\``).join(' '))

      details.push('')
      details.push('<br/>')
      details.push('')

      details.push(`Package &nbsp;&nbsp;&nbsp; __\`${tag.package}\`__  `)
      details.push(`Service &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; __\`${tag.service}\`__  `)
      details.push(`Function &nbsp;&nbsp;&nbsp; __\`${tag.function}\`__  `)

      const pt = /^import ["']([^'"]+)/mg
      const cnt = readFileSync(tag.proto).toString()
      let m = pt.exec(cnt)
      let protoFiles = []
      while (m) {
        protoFiles.push(m[1].trim())
        m = pt.exec(cnt)
      }
      const dirs = tag.config?.includeDirs || [dirname(tag.proto)]
      protoFiles = [
        tag.proto,
        ...dirs.map(dir => {
          return protoFiles.map(f => join(dir, f)).find(f => existsSync(f))
        }).filter(e => e)
      ]
      protoFiles.forEach(protoFile => {
        const protoName = basename(protoFile)
        details.push(`<details><summary><code>${protoName}</code></summary>`, '')
        details.push('```proto', readFileSync(protoFile).toString(), '```', '')
        details.push('</details>', '')
      })

      details.push('<br/>', `<details><summary>testapi6.yaml</summary>`, '')
      details.push('```yaml', dump({ gRPC: tag.toTestAPI6() }), '```', '')
      details.push('</details>', '')

      details.push('<br/>', '<br/>', '', '### Request', '')

      // Request
      const _metadata = tag.metadata || {}
      const metadata = this.allowMetadata?.length ? pick(_metadata, this.allowMetadata) : _metadata
      if (isGotData(metadata, true)) {
        details.push(`<details><summary>Metadata</summary>`, '')
        details.push('```json', JSON.stringify(metadata, null, '  '), '```', '')
        details.push(`</details>`, '')

        details.push('```yaml')
        details.push(schemaToMD(merge({}, toJsonSchema(metadata), tag.docs.metadata)))
        details.push('```', '')
      }

      // Input
      if (tag.input) {
        if (isGotData(tag.input, false)) {
          details.push(`<details><summary>Input</summary>`, '')
          if (typeof tag.input === 'object') {
            details.push('```json', JSON.stringify(tag.input, null, '  '), '```', '')
          } else {
            details.push('```text', tag.input, '```')
          }
          details.push(`</details>`, '')

          details.push('```yaml')
          details.push(schemaToMD(merge({}, toJsonSchema(tag.input), tag.docs.input)))
          details.push('```', '')
        }
      }

      if (tag.output) {
        details.push('', '<br/>', '', '### Response', '')

        // Output
        if (isGotData(tag.output?.data, false)) {
          details.push(`<details><summary>Output</summary>`, '')
          if (typeof tag.output.data === 'object') {
            details.push('```json', JSON.stringify(tag.output.data, null, '  '), '```', '')
          } else {
            details.push('```text', tag.output.data, '```', '')
          }
          details.push(`</details>  `, '')

          if (typeof tag.output.data === 'object') {
            details.push('```yaml')
            details.push(schemaToMD(merge({}, toJsonSchema(tag.output.data), tag.docs.output)))
            details.push('```', '')
          }
        }
      }
      details.push('')
      details.push('<br/><br/>')
      details.push('')
    })
    menu = menu.concat(menus)

    this.content = menu.concat(details).join('\n')

    if (!this.title) this.title = 'Markdown document'
    await this.save()
  }
}
