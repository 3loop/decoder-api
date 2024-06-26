import { contractMetaTable } from "@/db/schema"
import type { ContractData } from "@3loop/transaction-decoder"
import {
  ContractMetaStore,
  ERC20RPCStrategyResolver,
  NFTRPCStrategyResolver,
  PublicClient,
} from "@3loop/transaction-decoder"
import * as SqliteDrizzle from "@effect/sql-drizzle/Sqlite"
import { and, eq } from "drizzle-orm"
import { Effect, Layer } from "effect"

export const ContractMetaStoreLive = Layer.effect(
  ContractMetaStore,
  Effect.gen(function* () {
    const db = yield* SqliteDrizzle.SqliteDrizzle

    const publicClient = yield* PublicClient
    const erc20Loader = ERC20RPCStrategyResolver(publicClient)
    const nftLoader = NFTRPCStrategyResolver(publicClient)

    return ContractMetaStore.of({
      strategies: { default: [erc20Loader, nftLoader] },
      set: (key, value) =>
        Effect.gen(function* () {
          if (value.status === "success") {
            yield* db
              .insert(contractMetaTable)
              .values({
                address: key.address,
                chain: key.chainID,
                contractName: value.result.contractName,
                tokenSymbol: value.result.tokenSymbol,
                decimals: value.result.decimals,
                type: value.result.type,
                status: "success",
              })
              .pipe(Effect.catchAll(() => Effect.succeed(null)))
          } else {
            yield* db
              .insert(contractMetaTable)
              .values([
                {
                  address: key.address,
                  chain: key.chainID,
                  contractName: null,
                  tokenSymbol: null,
                  decimals: null,
                  type: null,
                  status: "not-found",
                },
              ])
              .pipe(Effect.catchAll(() => Effect.succeed(null)))
          }
        }),
      get: ({ address, chainID }) =>
        Effect.gen(function* () {
          const items = yield* db
            .select()
            .from(contractMetaTable)
            .where(
              and(
                eq(contractMetaTable.address, address),
                eq(contractMetaTable.chain, chainID),
              ),
            )
            .pipe(Effect.catchAll(() => Effect.succeed([])))

          const item = items[0]

          if (item != null && item.status === "success") {
            return {
              status: "success",
              result: {
                address: item.address,
                contractAddress: item.address,
                contractName: item.contractName,
                tokenSymbol: item.tokenSymbol,
                decimals: item.decimals,
                type: item.type,
                chainID: item.chain,
              } as ContractData,
            }
          } else if (item != null && item.status === "not-found") {
            return {
              status: "not-found",
              result: null,
            }
          }

          return {
            status: "empty",
            result: null,
          }
        }),
    })
  }),
)
