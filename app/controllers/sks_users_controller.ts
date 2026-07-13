import { DateTime } from "luxon";

import type { HttpContext } from "@adonisjs/core/http";

import { InternalServerException } from "#exceptions/http_exceptions";
import SksUser from "#models/sks_user";

//this value determines the period over which the trend will be counted (multiply the value by 5 minutes)
const trendDelta = 3;

enum Trend {
  INCREASING = "INCREASING",
  DECREASING = "DECREASING",
  STABLE = "STABLE",
}

export default class SksUsersController {
  /**
   * @latest
   * @summary Display the latest SKS users record based on the current time
   * @description Display the latest SKS users record based on the current time
   * @responseBody 200 - <SksUser>.append("trend":"INCREASING","isResultRecent":true,"nextUpdateTimestamp": "2024-11-11T18:12:30.962+00:00")
   * @responseBody 404 - {"message":"Could not find the matching data in database"}
   * @responseBody 500 - {"message":"Failed to convert time to SQL format"}
   * @responseBody 500 - {"message":"Failed to fetch the latest SKS user","error": "Some error message"}
   */
  async latest({ response }: HttpContext) {
    const currentTime = DateTime.now().setZone("Europe/Warsaw").toSQL();
    if (currentTime === null) {
      throw new InternalServerException("Failed to convert time to SQL format");
    }
    const latestData = await SksUser.query()
      .where("externalTimestamp", "<", currentTime)
      .orderBy("externalTimestamp", "desc")
      .firstOrFail()
      .addErrorContext({
        message: "Could not find the matching data in database",
        status: 404,
        code: "E_NOT_FOUND",
      });
    const isResultRecent = latestData.activeUsers > 0;
    // If the first record has activeUsers set to 0, get the second record instead
    const entryToReturn = isResultRecent
      ? latestData
      : await SksUser.query()
          .where("externalTimestamp", "<", currentTime)
          .orderBy("externalTimestamp", "desc")
          .offset(1)
          .firstOrFail()
          .addErrorContext({
            message: "Could not find matching data in db",
            status: 404,
            code: "E_NOT_FOUND",
          });
    const referenceTime = entryToReturn.externalTimestamp.toSQL();
    if (referenceTime === null) {
      throw new InternalServerException("Failed to convert time to SQL format");
    }
    const trend = await this.calculateTrend(
      entryToReturn,
      referenceTime,
      trendDelta,
    );
    const nextUpdateTimestamp = entryToReturn.updatedAt.plus({
      minute: 5,
      second: 30,
    });
    return response.status(200).json({
      ...entryToReturn.toJSON(),
      trend,
      isResultRecent,
      nextUpdateTimestamp,
    });
  }

  /**
   * @today
   * @summary Display all the SKS users data from today
   * @description Display all the SKS users data from today
   * @responseBody 200 - <SksUser[]>
   * @responseBody 500 - {"message":"Failed to convert time to SQL format"}
   * @responseBody 500 - {"message":"Failed to fetch today's SKS users","error": "Some error message"}
   */
  async today({ response }: HttpContext) {
    const currentDateTime = DateTime.now().setZone("Europe/Warsaw");

    const todayStart = currentDateTime
      .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
      .toSQL();

    const todayEnd = currentDateTime
      .set({ hour: 23, minute: 59, second: 59, millisecond: 999 })
      .toSQL();

    if (todayStart === null || todayEnd === null) {
      throw new InternalServerException("Failed to convert time to SQL format");
    }

    const todayData = await SksUser.query()
      .whereBetween("externalTimestamp", [todayStart, todayEnd])
      .orderBy("externalTimestamp", "asc")
      .addErrorContext(
        () => `Failed to fetch users for ${todayStart} to ${todayEnd}`,
      );
    return response.status(200).json(todayData);
  }

  /**
   * Helper function to calculate trend
   */
  private async calculateTrend(
    latestData: SksUser,
    referenceTime: string,
    delta: number,
  ): Promise<Trend> {
    const trendData = await SksUser.query()
      .where("externalTimestamp", "<", referenceTime)
      .orderBy("externalTimestamp", "desc")
      .offset(delta)
      .first()
      .addErrorContext(
        () =>
          `Failed to fetch trend data for ${referenceTime} with delta ${delta}`,
      );

    if (trendData === null) {
      return Trend.STABLE; // If no previous data, assume stable trend
    }

    if (trendData.activeUsers < latestData.activeUsers) {
      return Trend.INCREASING;
    } else if (trendData.activeUsers > latestData.activeUsers) {
      return Trend.DECREASING;
    } else {
      return Trend.STABLE;
    }
  }
}
