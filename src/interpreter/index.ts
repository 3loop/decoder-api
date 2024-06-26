import { DecodedTx } from "@3loop/transaction-decoder"
import {
  QuickjsConfig,
  QuickjsInterpreterLive,
  TransactionInterpreter,
} from "@3loop/transaction-interpreter"
import { Effect, Layer } from "effect"

const config = Layer.succeed(QuickjsConfig, {
  runtimeConfig: { timeout: 1000 },
})

export const InterpreterLive = Layer.provide(QuickjsInterpreterLive, config)

export const interpretTransaction = (decodedTx: DecodedTx) =>
  Effect.gen(function* () {
    const interpreterService = yield* TransactionInterpreter

    const interpreter = interpreterService.findInterpreter(decodedTx)

    if (interpreter == null) {
      // TODO: use a default interpreter
      return Effect.fail("Interpreter not found")
    }

    const result = yield* interpreterService.interpretTx(decodedTx, interpreter)

    return result
  })
