import axios from 'axios'
import * as cheerio from 'cheerio'
import Meal, { MealCategory } from '#models/meal'
import { createHash } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import WebsiteHash from '#models/website_hash'
import logger from '@adonisjs/core/services/logger'
import HashesMeal from '#models/hashes_meal'
import { DateTime } from 'luxon'

export const url = 'https://sks.pwr.edu.pl/menu/'

export async function runScrapper() {
  const trx = await db.transaction()
  try {
    const currentHash = await cacheMenu()
    const storedHash = await WebsiteHash.query().where('hash', currentHash).first()

    if (storedHash !== null) {
      await storedHash.merge({ updatedAt: DateTime.local() }).save()
      logger.info('Hash already exists in the database. Not proceeding with scraping.')
      await trx.commit()
      return
    }

    const newWebsiteHash = await WebsiteHash.create({ hash: currentHash }, { client: trx })
    const meals = await scrapeMenu()

    for (const meal of meals) {
      if (meal.price === 0) {
        meal.category = MealCategory.TECHNICAL_INFO
      }
      const newMeal = await checkIfMealExistsOrCreate(meal.name, meal.category)
      if (newMeal !== null) {
        await HashesMeal.create(
          {
            hashFk: newWebsiteHash.hash,
            mealId: newMeal.id,
            size: meal.size,
            price: meal.price,
          },
          { client: trx }
        )
        logger.debug(`${meal.name} added as ${newWebsiteHash.hash} connection.`)
      }
    }
    logger.info('Menu updated successfully.')
    await trx.commit()
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

          const sizeMatch = itemText.match(/\d+(?:g|ml)?(?:\/\d+(?:g|ml)?)?\s+(?=\d+(?=\.\d+)?)/)
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

async function checkIfMealExistsOrCreate(name: string, category: MealCategory | null) {
  try {
    let mealQuery = Meal.query().where('name', name)

    if (category !== null) {
      mealQuery = mealQuery.where('category', category)
    } else {
      mealQuery = mealQuery.whereNull('category')
    }
    const mealOrNull = await mealQuery.first()
    logger.debug(`Checking if meal ${name} exists in the database.`)

    if (mealOrNull !== null) {
      logger.debug(`Meal ${name} already exists in the database`)
      return mealOrNull
    }

    logger.debug(`Meal ${name} does not exist in the database. Creating a new meal.`)
    return await Meal.create({ name, category })
  } catch (error) {
    logger.error(`Failed to check or create meal ${name}: ${error.message}`, error.stack)
    return null
  }
}
