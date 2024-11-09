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
    const minutesFromMidnight = currentDateTime.hour * 60 + currentDateTime.minute
    const updateBatchCount = Math.floor(minutesFromMidnight / 5)

    const rows = usersData.split('\n')
    const batchRows = rows.slice(0, updateBatchCount)

    for (const row of batchRows) {
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
    logger.info(`Successfully processed and saved ${rows.length} rows of sks_users data.`)
  } catch (error) {
    logger.error(`Failed to update sks_users data: ${error.message}`, error.stack)
  }
}
