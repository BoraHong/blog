import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import * as ExternalPlugin from "./.quartz/plugins"

type ExplorerNode = {
  isFolder: boolean
  displayName?: string
  slugSegment?: string
  data: {
    date?: string | Date
    filePath?: string
    frontmatter?: {
      date?: string | Date
    }
    slug?: string
  } | null
}

ExternalPlugin.Explorer({
  sortFn: (a: ExplorerNode, b: ExplorerNode) => {
    if (a.isFolder !== b.isFolder) {
      return a.isFolder ? -1 : 1
    }

    const byName = (a.displayName ?? "").localeCompare(b.displayName ?? "", undefined, {
      numeric: true,
      sensitivity: "base",
    })

    if (a.isFolder && b.isFolder) {
      return byName
    }

    let aDate = ""
    const aExplicitDate = a.data?.date ?? a.data?.frontmatter?.date
    if (aExplicitDate instanceof Date) {
      aDate = aExplicitDate.toISOString().slice(0, 10)
    } else if (typeof aExplicitDate === "string") {
      const parsedDate = Date.parse(aExplicitDate)
      if (!Number.isNaN(parsedDate)) {
        aDate = new Date(parsedDate).toISOString().slice(0, 10)
      }
    }
    if (!aDate) {
      const match = [a.data?.filePath, a.data?.slug, a.slugSegment, a.displayName]
        .join(" ")
        .normalize("NFC")
        .match(/(\d{4})[._-](\d{2})[._-](\d{2})/)
      aDate = match ? `${match[1]}-${match[2]}-${match[3]}` : ""
    }

    let bDate = ""
    const bExplicitDate = b.data?.date ?? b.data?.frontmatter?.date
    if (bExplicitDate instanceof Date) {
      bDate = bExplicitDate.toISOString().slice(0, 10)
    } else if (typeof bExplicitDate === "string") {
      const parsedDate = Date.parse(bExplicitDate)
      if (!Number.isNaN(parsedDate)) {
        bDate = new Date(parsedDate).toISOString().slice(0, 10)
      }
    }
    if (!bDate) {
      const match = [b.data?.filePath, b.data?.slug, b.slugSegment, b.displayName]
        .join(" ")
        .normalize("NFC")
        .match(/(\d{4})[._-](\d{2})[._-](\d{2})/)
      bDate = match ? `${match[1]}-${match[2]}-${match[3]}` : ""
    }

    if (aDate && bDate && aDate !== bDate) {
      return aDate.localeCompare(bDate)
    }

    if (aDate && !bDate) {
      return -1
    }

    if (!aDate && bDate) {
      return 1
    }

    return byName
  },
})

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()
