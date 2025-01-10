import fs from "node:fs";
import path from "node:path";

import { test } from "@japa/runner";

import { expectedResponse } from "#tests/fixtures/parsed_menu_expected_response";

import { scrapeMenu } from "../../../scripts/menu_scrapper.js";

test.group("Menu scrapper scrape menu", () => {
  test("should parse the external menu response", async ({ assert }) => {
    const htmlResponse = fs.readFileSync(
      path.resolve("./tests/fixtures/external_menu_response.html"),
      "utf8",
    );

    const response = await scrapeMenu(htmlResponse);
    assert.deepEqual(response, expectedResponse);
  });
});
