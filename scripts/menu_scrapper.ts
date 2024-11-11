import axios from 'axios'
import * as cheerio from 'cheerio'
import Meal, { MealCategory } from '#models/meal'
import { createHash } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import WebsiteHash from '#models/website_hash'
import logger from '@adonisjs/core/services/logger'

const url = 'https://sks.pwr.edu.pl/menu/'

export async function runScrapper() {
  const trx = await db.transaction()
  try {
    const currentHash = await cacheMenu()
    const storedHash = await WebsiteHash.first()

    if (storedHash === null || storedHash.hash === '') {
      logger.info('No hash found in database. Storing current hash and scraping menu.')
      await WebsiteHash.create({ hash: currentHash }, { client: trx })
    } else if (storedHash.hash === currentHash) {
      logger.info('Did not find any differences. Not proceeding with scraping.')
      await trx.rollback()
      return
    }

    const meals = await scrapeMenu()
    await Meal.query({ client: trx }).delete()
    await Meal.createMany(meals, { client: trx })

    if (storedHash) {
      await storedHash.merge({ hash: currentHash }).save()
    }

    await trx.commit()
    logger.info('Menu updated successfully.')
  } catch (error) {
    await trx.rollback()
    logger.error(`Failed to update menu: ${error.message}`, error.stack)
  }
}

export async function scrapeMenu() {
  const response = await axios.get(url)
  const $ = cheerio.load(response.data)

  return $('.category')
    .map((_, category) => {
      const categoryName = $(category).find('.cat_name h2').text().trim()

      return $(category)
        .find('.pos ul li')
        .map((__, item) => {
          const itemText = $(item).text().trim().replace(/\s+/g, ' ')
          const price = $(item).find('.price').text().trim()
          const priceNumeric = Number.parseFloat(price)

          const nameMatch = itemText.match(/[\D\s]+/)
          const itemName = nameMatch ? nameMatch[0].trim() : itemText

          const sizeMatch = itemText.match(/\d+(?:g|ml)(?:\/\d+(?:g|ml))?/)
          const itemSize = sizeMatch ? sizeMatch[0].trim() : null

          return {
            name: itemName,
            size: itemSize,
            price: priceNumeric,
            category: assignCategories(categoryName),
          }
        })
        .get()
    })
    .get()
    .flat()
}

export async function cacheMenu() {
  const response = await axios.get(url)
  return createHash('sha256').update(response.data).digest('hex')
}

function assignCategories(category: string) {
  switch (category.toLowerCase()) {
    case 'surówki':
      return MealCategory.SALAD
    case 'zupy':
      return MealCategory.SOUP
    case 'dania jarskie':
      return MealCategory.VEGETARIAN_DISH
    case 'dania mięsne':
      return MealCategory.MEAT_DISH
    case 'dodatki':
      return MealCategory.SIDE_DISH
    case 'desery':
      return MealCategory.DESSERT
    case 'kompoty i napoje':
      return MealCategory.DRINK
    default:
      return null
  }
}
