import axios from 'axios'
import * as cheerio from 'cheerio'
import { MealCategory } from '#models/meal'

export async function scrapeMenu() {
  const url = 'https://sks.pwr.edu.pl/menu/'

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
