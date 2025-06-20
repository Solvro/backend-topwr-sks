import { DateTime } from "luxon";

import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

import Device from "./device.js";
import Meal from "./meal.js";

export default class Subscription extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare mealId: number;

  @column()
  declare deviceId: number;

  @belongsTo(() => Meal)
  declare meal: BelongsTo<typeof Meal>;

  @belongsTo(() => Device)
  declare device: BelongsTo<typeof Device>;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;
}
