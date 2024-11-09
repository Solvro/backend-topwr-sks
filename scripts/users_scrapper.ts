import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import SksUser from '#models/sks_user'

const url = 'https://live.pwr.edu.pl/sks/sks-data.csv'

export async function runScrapper() {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      logger.error(`Failed to fetch data: ${response.status} ${response.statusText}`)
      return
    }

    const usersData = await response.text()
    const currentDateTime = DateTime.now().setZone('Europe/Warsaw')

    const rows = usersData.trim().split('\n')
    for (const row of rows) {
      const [time, movingAverage21, activeUsers] = row.split(';')
      const timestamp = currentDateTime.set({
        hour: Number.parseInt(time.split(':')[0], 10),
        minute: Number.parseInt(time.split(':')[1], 10),
        second: 0,
        millisecond: 0,
      })

      await SksUser.updateOrCreate(
        {
          externalTimestamp: timestamp,
        },
        {
          activeUsers: Number(activeUsers),
          movingAverage21: Number(movingAverage21),
        }
      )
    }
    logger.info(`SKS users data updated successfully.`)
  } catch (error) {
    logger.error(`Failed to update sks_users data: ${error.message}`, error.stack)
  }
}
