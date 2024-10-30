import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { runScrapper } from '../scripts/scrapper.js'

export default class Scrape extends BaseCommand {
  static commandName = 'scrape'
  static description = 'Scrape sks menu data.'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    await runScrapper()
  }
}
