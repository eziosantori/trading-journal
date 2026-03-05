/**
 * Helper functions for extracting values from Notion page properties.
 * Notion properties have a verbose nested structure — these helpers make
 * the mapping code readable.
 */
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'

type Props = PageObjectResponse['properties']

export function num(props: Props, key: string): number | null {
  const p = props[key]
  if (!p || p.type !== 'number') return null
  return p.number
}

export function select(props: Props, key: string): string | null {
  const p = props[key]
  if (!p || p.type !== 'select') return null
  return p.select?.name ?? null
}

/** Reads a Notion "Status" type property (distinct from "Select"). */
export function statusProp(props: Props, key: string): string | null {
  const p = props[key]
  if (!p || p.type !== 'status') return null
  return p.status?.name ?? null
}

export function multiSelect(props: Props, key: string): string[] {
  const p = props[key]
  if (!p || p.type !== 'multi_select') return []
  return p.multi_select.map((s) => s.name)
}

export function richText(props: Props, key: string): string | null {
  const p = props[key]
  if (!p || p.type !== 'rich_text') return null
  return p.rich_text.map((t) => t.plain_text).join('') || null
}

export function titleText(props: Props): string {
  const p = Object.values(props).find((p) => p.type === 'title')
  if (!p || p.type !== 'title') return ''
  return p.title.map((t) => t.plain_text).join('')
}

export function dateStart(props: Props, key: string): string | null {
  const p = props[key]
  if (!p || p.type !== 'date') return null
  return p.date?.start ?? null
}

export function relation(props: Props, key: string): string | null {
  const p = props[key]
  if (!p || p.type !== 'relation') return null
  return p.relation[0]?.id ?? null
}

export function checkbox(props: Props, key: string): boolean {
  const p = props[key]
  if (!p || p.type !== 'checkbox') return false
  return p.checkbox
}

/** Builds a Notion rich_text property value from a plain string. */
export function toRichText(content: string) {
  return [{ text: { content } }]
}
