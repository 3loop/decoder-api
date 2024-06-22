import { BunHttpServer, BunRuntime } from '@effect/platform-bun'

import * as Dotenv from 'dotenv'
import { Config, Effect, Layer, LogLevel, Logger } from 'effect'
import { DatabaseLive } from './db'
import { AbiStoreLive } from './decoder/abi-loader'
import { ContractMetaStoreLive } from './decoder/meta-loader'
import { RPCProviderLive } from './decoder/provider'
import { InterpreterLive } from './interpreter'
import { HttpLive } from './router'
import { TracingLive } from './Tracing'

Dotenv.config()

const LogLevelLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const debug = yield* Config.withDefault(Config.boolean('DEBUG'), false)
    const level = debug ? LogLevel.All : LogLevel.Info
    return Logger.minimumLogLevel(level)
  }),
)

const DataLayer = Layer.mergeAll(RPCProviderLive, DatabaseLive)
const LoadersLayer = Layer.mergeAll(ContractMetaStoreLive, AbiStoreLive)
const DecoderLayer = Layer.provideMerge(LoadersLayer, DataLayer)

const MainLive = Layer.provide(HttpLive, BunHttpServer.layer({ port: process.env.PORT })).pipe(
  Layer.provide(LogLevelLive),
  Layer.provide(Logger.logFmt),
  Layer.provide(DecoderLayer),
  Layer.provide(InterpreterLive),
  Layer.provide(TracingLive),
)

BunRuntime.runMain(Layer.launch(MainLive))
