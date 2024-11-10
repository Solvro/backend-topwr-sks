import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { runScrapper } from '../scripts/menu_scrapper.js'

export default class ScrapeMenu extends BaseCommand {
  static commandName = 'scrape:menu'
  static description = 'Scrape sks menu data.'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    await runScrapper()
  }
}
