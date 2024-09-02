import { HttpRouter, HttpServerResponse, OpenApi } from "@effect/platform"
import { Effect } from "effect"
import { Api } from "./api"

const title = "Swagger UI"
const CDN_BASE = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@^5"

const SwaggerHtml = ({ spec }: { spec: string }) => `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="${title}" />
        <title>${title}</title>
        <link rel="stylesheet" href="${CDN_BASE}/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="${CDN_BASE}/swagger-ui-bundle.js" crossorigin></script>
        <script
          src="${CDN_BASE}/swagger-ui-standalone-preset.js"
          crossorigin
        ></script>
        <script>
          window.onload = () => {
            window.ui = SwaggerUIBundle({
              spec: ${spec},
              dom_id: "#swagger-ui",
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset,
              ],
              layout2: "StandaloneLayout",
            });
          };
        </script>
      </body>
    </html> `

export const SwaggerUIRoute = HttpRouter.get(
  "/swagger",
  Effect.gen(function* () {
    const openapi = OpenApi.fromApi(Api)

    return yield* HttpServerResponse.html(SwaggerHtml({
      spec: JSON.stringify(openapi),
    }))
  }),
)
