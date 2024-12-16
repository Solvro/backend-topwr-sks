import { DateTime } from "luxon";

import { BaseModel, column, hasMany } from "@adonisjs/lucid/orm";
import type { HasMany } from "@adonisjs/lucid/types/relations";

import HashesMeal from "./hashes_meal.js";

export enum MealCategory {
  SALAD = "SALAD",
  SOUP = "SOUP",
  VEGETARIAN_DISH = "VEGETARIAN_DISH",
  MEAT_DISH = "MEAT_DISH",
  DESSERT = "DESSERT",
  SIDE_DISH = "SIDE_DISH",
  DRINK = "DRINK",
  TECHNICAL_INFO = "TECHNICAL_INFO",
}

export default class Meal extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  // @example(Frytki z batatów)
  declare name: string;

  @column()
  // I know it is made badly but unfortunately autoswagger does not support enums
  // @example(SALAD, SOUP, VEGETARIAN_DISH, MEAT_DISH, DESSERT, SIDE_DISH, DRINK, TECHNICAL_INFO)
  declare category: MealCategory | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @hasMany(() => HashesMeal)
  declare hashes: HasMany<typeof HashesMeal>;
}
