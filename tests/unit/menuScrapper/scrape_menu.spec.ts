import fs from "node:fs";
import path from "node:path";

import { test } from "@japa/runner";

import { expectedResponse } from "#tests/fixtures/parsed_menu_expected_response";

import { parseMenu } from "../../../scripts/menu_scrapper.js";

test.group("Menu scrapper scrape menu", () => {
  test("should parse the external menu response", async ({ assert }) => {
    const htmlResponse = fs.readFileSync(
      path.resolve("./tests/fixtures/external_menu_response.html"),
      "utf8",
    );

    const response = await parseMenu(htmlResponse);
    assert.deepEqual(response, expectedResponse);
  });

  test("should strip trailing variant suffix from size", async ({ assert }) => {
    const htmlResponse = `
      <div class="category">
        <div class="cat_name"><h2>Dania jarskie</h2></div>
        <div class="pos_group">
          <div class="pos">
            <ul>
              <li>Papryka fasz. warzywami i ryżem 250g_ <span class="price">17.00</span></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="category">
        <div class="cat_name"><h2>Dania mięsne</h2></div>
        <div class="pos_group">
          <div class="pos">
            <ul>
              <li>Butter chicken 200 g_ <span class="price">17.00</span></li>
              <li>Kotlec drobiowy 180gr_2 <span class="price">18.00</span></li>
              <li>Makaron penne z sosem bolońskim 200g/100g_1 <span class="price">19.50</span></li>
            </ul>
          </div>
        </div>
      </div>
    `;

    const response = await parseMenu(htmlResponse);

    assert.deepEqual(response, [
      {
        name: "Papryka fasz. warzywami i ryżem",
        size: "250g",
        price: 17,
        category: "VEGETARIAN_DISH",
      },
      {
        name: "Butter chicken",
        size: "200g",
        price: 17,
        category: "MEAT_DISH",
      },
      {
        name: "Kotlec drobiowy",
        size: "180gr",
        price: 18,
        category: "MEAT_DISH",
      },
      {
        name: "Makaron penne z sosem bolońskim",
        size: "200g/100g",
        price: 19.5,
        category: "MEAT_DISH",
      },
    ]);
  });
});
