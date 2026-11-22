import { sqliteTable, text, integer, primaryKey, uniqueIndex, foreignKey } from 'drizzle-orm/sqlite-core';
// 2026-11-22 Sites-only boundary: identity comes from Sites request headers.
// Composite keys keep owner isolation in storage, including pet references.
export const records = sqliteTable('records', {
  owner: text('owner').notNull(), id: text('id').notNull(), kind: text('kind').notNull(),
  pet_id: text('pet_id'), data: text('data').notNull(), revision: integer('revision').notNull(),
  idempotency_key: text('idempotency_key'), created_at: text('created_at').notNull(), updated_at: text('updated_at').notNull(),
}, (t): any => [primaryKey({columns:[t.owner,t.id]}), uniqueIndex('records_idempotency').on(t.owner,t.idempotency_key),
  foreignKey({columns:[t.owner,t.pet_id],foreignColumns:[t.owner,t.id]})]);
export const attachments = sqliteTable('attachments', {
  owner:text('owner').notNull(), id:text('id').notNull(), mime:text('mime').notNull(), size:integer('size').notNull(), created_at:text('created_at').notNull(),
},t=>[primaryKey({columns:[t.owner,t.id]})]);
export const audit = sqliteTable('audit', {
  owner:text('owner').notNull(), id:text('id').notNull(), record_id:text('record_id').notNull(), operation:text('operation').notNull(),
  before_json:text('before_json'), after_json:text('after_json'), created_at:text('created_at').notNull(),
},t=>[primaryKey({columns:[t.owner,t.id]})]);
