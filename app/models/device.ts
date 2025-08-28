import { DateTime } from "luxon";

import { BaseModel, column } from "@adonisjs/lucid/orm";

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
  declare id: number;

  @column()
  declare deviceKey: string;

  @column()
  declare registrationToken: string | null;

  @column.dateTime()
  declare tokenTimestamp: DateTime<true> | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime<true>;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime<true>;

  public static async refreshTokenTimestamps(ids: number[]) {
    return Device.query()
      .update({
        tokenTimestamp: DateTime.now(),
      })
      .where("id", ids);
  }

  public static async removeTokens(ids: number[]) {
    return Device.query()
      .update({
        registrationToken: null,
        tokenTimestamp: null,
      })
      .where("id", ids);
  }
}
