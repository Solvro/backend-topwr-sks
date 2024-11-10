import scheduler from 'adonisjs-scheduler/services/main'
import { runScrapper as runMenuScrapper } from '../scripts/menu_scrapper.js'
import { runScrapper as runUsersScrapper } from '../scripts/users_scrapper.js'
import logger from '@adonisjs/core/services/logger'

scheduler
  .call(() => {
    logger.info('Running menu scraper.')
    void runMenuScrapper()
  })
  .immediate()
  .everyFiveMinutes()

scheduler
  .call(() => {
    logger.info('Running users scraper.')
    void runUsersScrapper()
  })
  .immediate()
  .everyMinute()
