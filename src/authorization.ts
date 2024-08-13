import { HttpMiddleware, HttpServerRequest } from "@effect/platform"
import { Context, Effect } from "effect"
import { Schema } from "@effect/schema"
import * as SqliteDrizzle from "@effect/sql-drizzle/Sqlite"
import { apiKeys } from "./db/schema"
import { eq } from "drizzle-orm"

interface AuthorizationContext {
  readonly Authorization: string | undefined
  readonly isAuthorized: Effect.Effect<boolean, AuthorizationError, never>
}

interface Authorization {
  readonly _: unique symbol
}

export class AuthorizationError {
  readonly _tag = "AuthorizationError"
  constructor(readonly message: string) { }
}

export const Authorization = Context.GenericTag<AuthorizationContext>(
  "@3loop/authorization",
)

export const Headers = Schema.Struct({
  "x-api-key": Schema.optional(Schema.String),
})

const makeAuthorization = Effect.gen(function* () {
  const db = yield* SqliteDrizzle.SqliteDrizzle
  const request = yield* HttpServerRequest.schemaHeaders(Headers).pipe(
    Effect.mapError(() => new AuthorizationError("Malformed x-api-key header")),
  )

  return Authorization.of({
    Authorization: request["x-api-key"],
    isAuthorized: Effect.gen(function* () {
      if (request["x-api-key"] != null) {
        const apiKey = yield* db
          .select()
          .from(apiKeys)
          .where(eq(apiKeys.apiKey, request["x-api-key"]))
          .pipe(Effect.mapError(() => new AuthorizationError("Database error")))

        if (apiKey[0] == null) {
          return yield* Effect.fail(new AuthorizationError("Invalid API key"))
        } else {
          return true
        }
      }

      return yield* Effect.fail(new AuthorizationError("Missing API key"))
    }),
  })
}).pipe(Effect.withSpan("Authorization check"))

export const authorizationMiddleware = HttpMiddleware.make((app) =>
  Effect.gen(function* (_) {
    return yield* app.pipe(
      Effect.provideServiceEffect(Authorization, makeAuthorization),
    )
  }),
)
