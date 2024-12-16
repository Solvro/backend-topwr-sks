import { DateTime } from "luxon";

import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

import Meal from "./meal.js";
import WebsiteHash from "./website_hash.js";

export default class HashesMeal extends BaseModel {
  @column({ isPrimary: true })
  // @example(80845fe1a68deadbb4febc3f6dbae98b64a3df7a1648edd417a8ece3164182f4)
  declare hashFk: string;

  @column({ isPrimary: true })
  declare mealId: number;

  @column()
  // @example(200g/10g)
  declare size: string | null;

  @column()
  // @example(21.00)
  declare price: number;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @belongsTo(() => Meal)
  // @no-swagger
  declare meal: BelongsTo<typeof Meal>;

  @belongsTo(() => WebsiteHash, { foreignKey: "hashFk" })
  // @no-swagger
  declare websiteHash: BelongsTo<typeof WebsiteHash>;
}
