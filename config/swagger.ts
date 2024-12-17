// for AdonisJS v6
import path from "node:path";
import url from "node:url";

// ---

export default {
  // path: __dirname + "/../", for AdonisJS v5
  path: `${path.dirname(url.fileURLToPath(import.meta.url))}/../`, // for AdonisJS v6
  title: "Foo", // use info instead
  version: "1.0.0", // use info instead
  description: "", // use info instead
  tagIndex: 3,
  info: {
    title: "SKS-Scrapper",
    version: "1.0.0",
    description:
      "The SKS Menu Scraper is a tool that automatically fetches and parses canteen menu data, including dish names, portion sizes, and prices, storing the information in a database. It also features a wrapper for tracking the number of canteen users, providing a comprehensive solution for managing both menu and user data through a RESTful API.",
  },
  snakeCase: true,

  debug: false, // set to true, to get some useful debug output
  ignore: [
    "/api/v1/swagger",
    "/api/v1/docs",
    "/",
    "/api",
    "/api/v1",
    "/api/docs",
    "/docs",
  ],
  preferredPutPatch: "PUT", // if PUT/PATCH are provided for the same route, prefer PUT
  common: {
    parameters: {}, // OpenAPI conform parameters that are commonly used
    headers: {}, // OpenAPI conform headers that are commonly used
  },
  securitySchemes: {}, // optional
  authMiddlewares: ["auth", "auth:api"], // optional
  defaultSecurityScheme: "BearerAuth", // optional
  persistAuthorization: true, // persist authorization between reloads on the swagger page
  showFullPath: false, // the path displayed after endpoint summary
};
