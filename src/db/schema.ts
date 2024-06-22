import * as D from 'drizzle-orm/sqlite-core'

export const contractAbiTable = D.sqliteTable(
  'contractAbi',
  {
    address: D.text('address'),
    chain: D.integer('chain'),
    abi: D.text('abi'),
  },
  (table) => {
    return {
      pk: D.primaryKey({ columns: [table.address, table.chain] }),
    }
  },
)

export const contractFragmentsTable = D.sqliteTable('contractFragments', {
  signature: D.text('signature'),
  fragment: D.text('fragment'),
  type: D.text('type'),
})

export const contractMetaTable = D.sqliteTable(
  'contractMeta',
  {
    address: D.text('address'),
    chain: D.integer('chain'),
    contractName: D.text('contractName'),
    tokenSymbol: D.text('tokenSymbol'),
    decimals: D.integer('decimals'),
    type: D.text('type'),
  },
  (table) => {
    return {
      pk: D.primaryKey({ columns: [table.address, table.chain] }),
    }
  },
)
