import { OutputFile } from 'testapi6/dist/components/output/OutputFile'
import { merge, uniqBy } from 'lodash'
import { isGotData } from 'testapi6/dist/components/doc/DocUtils'
import { gRPC } from "./gRPC"

/**
 * Export markdown document
 * ```yaml
 * - gRPCDoc:
 *     saveTo: test.md                       # Markdown ouput file
 * ```
 */
export class gRPCDoc extends OutputFile {
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

  constructor(attrs) {
    super(attrs)
  }

  async exec() {
    let menu = []
    this.raw = merge({}, this.tc, this.raw)
    menu.push(`# ${this.raw.title || this.tc.title || ''}`)
    menu.push(`_${this.raw.description || this.tc.description || ''}_`)
    menu.push('')
    menu.push('')
    menu.push(`> Version \`${this.raw.version || this.tc.version || ''}\``)
    const developer = this.raw?.developer || this.tc.developer || ''
    if (developer) {
      menu.push(`> [Contact ${developer.split('@')[0]}](mailto:${developer})`)
    }
    menu.push(`> Last updated: \`${new Date().toString()}\``)
    menu.push('')
    menu.push('## APIs')
    const details = ['## Details']
    const apis = uniqBy(gRPC.APIs.filter(api => api.docs && api.title), e => `/${e.package}/${e.service}.${e.function}`)
    const tags = [] as { name: string, items: gRPC[] }[]
    apis.forEach(a => {
      a.docs = merge({ md: { tags: [] } }, a.docs)
      if (!a.docs.md.tags.length) {
        a.docs.md.tags.push('default')
      }
      a.docs?.md?.tags?.forEach(t => {
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
    menus.push(`|No.  | API Description | API Function |`)
    menus.push(`|---: | ---- | ---- |`)

    for (let tag of tags) {
      const idx = menus.length
      let len = 0
      tag.items.forEach((tag, i) => {
        len++
        menus.push(`|${i + 1}.| [**${tag.title}**](#${tag.index}) | \`/${tag.package}/${tag.service}.${tag.function}(?)\` |`)
      })
      menus.splice(idx, 0, `|  | __${tag.name}__ - _${len} items_ |  |`)
    }
    menu.push('')

    apis.forEach((tag) => {
      details.push(`### **${tag.title}**`)
      
      tag.description && details.push(`_${tag.description}_`)

      details.push('')
      details.push(`\`/${tag.package}/${tag.service}.${tag.function}(?)\``)
      details.push('')

      // Input metadata
      if (tag.metadata) {
        details.push('#### Metadata')
        if (isGotData(tag.metadata, true)) {
          details.push(...Object.keys(tag.metadata).map(k => `- \`${k}\`: *${tag.metadata[k]}*`))
        }
      }

      // Input body
      if (tag.input) {
        details.push('#### Input')
        if (isGotData(tag.input, false)) {
          details.push(`\`\`\`json`)
          details.push(JSON.stringify(tag.input, null, '  '))
          details.push(`\`\`\``)
        }
      }

      if (tag.output) {
        details.push('#### Output')
        // Output data
        if (isGotData(tag.output?.data, false)) {
          if (typeof tag.output.data === 'object') {
            details.push(`\`\`\`json`)
            details.push(JSON.stringify(tag.output.data, null, '  '))
            details.push(`\`\`\``)
          } else {
            details.push(`\`\`\`text`)
            details.push(tag.output.data)
            details.push(`\`\`\``)
          }
        }
      }
    })
    menu = menu.concat(menus)

    const servers = this.raw?.servers || this.tc.servers
    if (servers) {
      menu.push('## Servers')
      menu = menu.concat(Object.keys(servers).map(des => `- **${servers[des]}** - _${des}_`))
    }

    this.content = menu.concat(details).join('\n')

    if (!this.title) this.title = 'Markdown document'
    await this.save()
  }
}
