import { HttpContext } from '@adonisjs/core/http'
import SksUser from '#models/sks_user'
import { DateTime } from 'luxon'

//this value determines the period over which the trend will be counted (multiply the value by 5 minutes)
const trendDelta = 3

enum Trend {
  INCREASING = 'INCREASING',
  DECREASING = 'DECREASING',
  STABLE = 'STABLE',
}

export default class SksUsersController {
  /**
   * Display the latest SKS users record based on time
   */
  async latest({ response }: HttpContext) {
    try {
      const currentTime = DateTime.now().setZone('Europe/Warsaw').toSQL()
      if (currentTime === null) {
        return response.status(500).json({ message: 'Failed to convert time to SQL format' })
      }

      let latestData = await SksUser.query()
        .where('externalTimestamp', '<', currentTime)
        .orderBy('externalTimestamp', 'desc')
        .first()
      let isResultRecent = true

      // If the first record has activeUsers set to 0, get the second record instead
      if (latestData !== null && latestData.activeUsers === 0) {
        latestData = await SksUser.query()
          .where('externalTimestamp', '<', currentTime)
          .orderBy('externalTimestamp', 'desc')
          .offset(1)
          .first()
        isResultRecent = false
      }

      if (latestData === null) {
        return response
          .status(404)
          .json({ message: 'Could not find the matching data in database' })
      }

      const referenceTime = latestData.externalTimestamp?.toSQL() || ''
      if (!referenceTime) {
        return response
          .status(500)
          .json({ message: 'Failed to convert external timestamp to SQL format' })
      }

      const trend = await this.calculateTrend(latestData, referenceTime, trendDelta)

      return response
        .status(200)
        .json({ ...latestData.toJSON(), trend: trend, isResultRecent: isResultRecent })
    } catch (error) {
      return response
        .status(500)
        .json({ message: 'Failed to fetch the latest SKS user', error: error.message })
    }
  }

  /**
   * Display all SKS user records for the current day
   */
  async today({ response }: HttpContext) {
    try {
      const currentDateTime = DateTime.now().setZone('Europe/Warsaw')
      const todayStart = currentDateTime
        .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
        .toSQL()
      const todayEnd = currentDateTime
        .set({ hour: 23, minute: 59, second: 59, millisecond: 999 })
        .toSQL()

      if (todayStart === null || todayEnd === null) {
        return response.status(500).json({ message: 'Failed to convert time to SQL format' })
      }

      const todayData = await SksUser.query()
        .whereBetween('externalTimestamp', [todayStart, todayEnd])
        .orderBy('externalTimestamp', 'asc')

      return response.status(200).json(todayData)
    } catch (error) {
      return response
        .status(500)
        .json({ message: "Failed to fetch today's SKS users", error: error.message })
    }
  }

  /**
   * Helper function to calculate trend
   */
  private async calculateTrend(
    latestData: SksUser,
    referenceTime: string,
    delta: number
  ): Promise<Trend> {
    const trendData = await SksUser.query()
      .where('externalTimestamp', '<', referenceTime)
      .orderBy('externalTimestamp', 'desc')
      .offset(delta)
      .first()

    if (trendData === null) {
      return Trend.STABLE // If no previous data, assume stable trend
    }

    if (trendData.activeUsers < latestData.activeUsers) {
      return Trend.INCREASING
    } else if (trendData.activeUsers > latestData.activeUsers) {
      return Trend.DECREASING
    } else {
      return Trend.STABLE
    }
  }
}
