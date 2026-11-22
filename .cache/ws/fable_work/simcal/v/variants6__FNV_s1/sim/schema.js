// DEV ONLY: a small JSON Schema (draft-07 subset) checker, enough for kit/mechfight.schema.json:
// type, const, enum, properties, required, items, minItems, maxItems, additionalProperties (schema or boolean),
// anyOf, oneOf, pattern and local $ref. Used by test_sim.js to validate every message the simulator produces
// and every action the bots return.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './config.js'

function typeOk(t, v) {
  switch (t) {
    case 'object': return v !== null && typeof v === 'object' && !Array.isArray(v)
    case 'array': return Array.isArray(v)
    case 'number': return typeof v === 'number' && Number.isFinite(v)
    case 'integer': return Number.isInteger(v)
    case 'string': return typeof v === 'string'
    case 'boolean': return typeof v === 'boolean'
    case 'null': return v === null
    default: return true
  }
}

export function validate(schema, value, root = schema, path = '$', errs = []) {
  if (errs.length > 20) return errs
  if (schema.$ref) {
    const name = schema.$ref.replace('#/definitions/', '')
    const target = root.definitions[name]
    if (!target) { errs.push(`${path}: unknown $ref ${schema.$ref}`); return errs }
    return validate(target, value, root, path, errs)
  }
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type]
    if (!types.some((t) => typeOk(t, value))) { errs.push(`${path}: expected ${types.join('|')}, got ${value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value}`); return errs }
  }
  if (schema.const !== undefined && value !== schema.const) errs.push(`${path}: expected const ${JSON.stringify(schema.const)}`)
  if (schema.enum && !schema.enum.includes(value)) errs.push(`${path}: ${JSON.stringify(value)} not in enum`)
  if (schema.pattern && typeof value === 'string' && !new RegExp(schema.pattern).test(value)) errs.push(`${path}: pattern mismatch`)
  for (const key of ['anyOf', 'oneOf']) {
    if (!schema[key]) continue
    let ok = 0, first = null
    for (const sub of schema[key]) { const e = validate(sub, value, root, path, []); if (e.length === 0) ok++; else if (!first) first = e }
    if (key === 'anyOf' ? ok === 0 : ok !== 1) errs.push(`${path}: matches ${ok} alternatives of ${key}${first ? ' (e.g. ' + first[0] + ')' : ''}`)
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errs.push(`${path}: fewer than ${schema.minItems} items`)
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errs.push(`${path}: more than ${schema.maxItems} items`)
    if (schema.items) for (let i = 0; i < value.length; i++) validate(schema.items, value[i], root, `${path}[${i}]`, errs)
  } else if (value !== null && typeof value === 'object') {
    for (const k of schema.required || []) if (value[k] === undefined) errs.push(`${path}: missing ${k}`)
    const props = schema.properties || {}
    for (const k in value) {
      if (value[k] === undefined) continue
      if (props[k]) validate(props[k], value[k], root, `${path}.${k}`, errs)
      else if (schema.additionalProperties === false) errs.push(`${path}: unexpected property ${k}`)
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') validate(schema.additionalProperties, value[k], root, `${path}.${k}`, errs)
    }
  }
  return errs
}

export function loadSchema(path = join(ROOT, 'kit', 'mechfight.schema.json')) {
  const root = JSON.parse(readFileSync(path, 'utf8'))
  const check = (def) => (value) => validate({ $ref: `#/definitions/${def}` }, value, root)
  return { root, hello: check('Hello'), obs: check('Observation'), action: check('Action'), end: check('EndMsg'), ready: check('Ready') }
}
