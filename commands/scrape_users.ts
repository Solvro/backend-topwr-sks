import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { runScrapper } from '../scripts/users_scrapper.js'

export default class ScrapeUsers extends BaseCommand {
  static commandName = 'scrape:users'
  static description = 'Scrape data about active users in SKS'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    await runScrapper()
  }
}
