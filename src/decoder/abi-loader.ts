import { contractAbiTable, contractFragmentsTable } from '@/db/schema'
import { AbiStore, EtherscanStrategyResolver, FourByteStrategyResolver } from '@3loop/transaction-decoder'
import * as SqliteDrizzle from '@effect/sql-drizzle/Sqlite'
import { eq } from 'drizzle-orm'
import { Effect, Layer } from 'effect'
import { LOCAL_FRAGMENTS } from './abis'

export const AbiStoreLive = Layer.effect(
  AbiStore,
  Effect.gen(function* () {
    const db = yield* SqliteDrizzle.SqliteDrizzle

    return AbiStore.of({
      strategies: {
        default: [
          // EtherscanStrategyResolver({}),
          // SourcifyStrategyResolver(),
          // OpenchainStrategyResolver(),
          // FourByteStrategyResolver(),
        ],
      },
      set: ({ address, func = {}, event = {} }) =>
        Effect.gen(function* (_) {
          if (address != null) {
            const abis = Object.entries(address)

            yield* db
              .insert(contractAbiTable)
              .values(
                abis.map(([address, abi]) => ({
                  address,
                  abi,
                })),
              )
              .pipe(Effect.catchAll(() => Effect.succeed(null)))
          }

          const signature = {
            ...func,
            ...event,
          }

          if (signature != null) {
            const fragments = Object.entries(signature)

            const entities = fragments.map(([signature, fragment]) => ({
              signature: signature,
              fragment: fragment,
              type: func[signature] ? 'function' : 'event',
            }))

            yield* db
              .insert(contractFragmentsTable)
              .values(entities)
              .pipe(Effect.catchAll(() => Effect.succeed(null)))
          }
        }),

      get: ({ address, signature, event }) =>
        Effect.gen(function* (_) {
          const sig = signature ?? event
          if (sig == null) return null

          // NOTE: For common contracts we store the fragment locally for fast access
          const match = LOCAL_FRAGMENTS[sig]
          if (match != null) {
            return `[${match.fragment}]`
          }

          // For non local abis we need to fetch from dynamodb
          const items = yield* db
            .select()
            .from(contractAbiTable)
            .where(eq(contractAbiTable.address, address))
            .pipe(Effect.catchAll(() => Effect.succeed([])))

          const item = items[0]

          if (item != null) {
            return item?.abi
          }

          const fragments = yield* db
            .select()
            .from(contractFragmentsTable)
            .where(eq(contractFragmentsTable.signature, sig))
            .pipe(Effect.catchAll(() => Effect.succeed([])))

          const fragment = fragments[0]

          if (fragment != null) {
            return `[${fragment.fragment}]`
          }

          return null
        }),
    })
  }),
)
