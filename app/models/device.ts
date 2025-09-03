import { DateTime } from "luxon";

import { BaseModel, column, manyToMany } from "@adonisjs/lucid/orm";
import type { ManyToMany } from "@adonisjs/lucid/types/relations";

import Meal from "#models/meal";

export const TOKEN_EXPIRATION_TIME_MS = 1000 * 60 * 60 * 24 * 270; // 270 days - mirroring the Firebase

/**
 * @param tokenTimestamp device.tokenTimestamp
 * @param relativeTime Timestamp relative to which calculations will be performed
 * @returns Token expiration time in millis. If negative, the token is invalid
 */
export function getTokenExpirationTime(
  tokenTimestamp: number,
  relativeTime: number,
): number {
  return TOKEN_EXPIRATION_TIME_MS + relativeTime - tokenTimestamp;
}

export default class Device extends BaseModel {
  @column({ isPrimary: true })
  declare deviceKey: string;

  @column()
  declare registrationToken: string | null;

  @column.dateTime()
  declare tokenTimestamp: DateTime<true> | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime<true>;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime<true>;

  @manyToMany(() => Meal, {
    pivotTable: "subscriptions",
    localKey: "deviceKey",
    pivotForeignKey: "device_key",
    relatedKey: "id",
    pivotRelatedForeignKey: "meal_id",
    pivotTimestamps: true,
  })
  declare meals: ManyToMany<typeof Meal>;

  public static async updateTokenTimestamps(ids: string[]) {
    return Device.query()
      .update({
        tokenTimestamp: DateTime.now(),
      })
      .whereIn("device_key", ids);
  }

  public static async removeTokens(ids: string[]) {
    return Device.query()
      .update({
        registrationToken: null,
        tokenTimestamp: null,
      })
      .whereIn("device_key", ids);
  }
}
