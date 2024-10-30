import scheduler from 'adonisjs-scheduler/services/main'
import { runScrapper } from '../scripts/scrapper.js'
import logger from '@adonisjs/core/services/logger'

scheduler
  .call(() => {
    logger.info('Running scraper.')
    void runScrapper()
  })
  .immediate()
  .everyFifteenMinutes()
