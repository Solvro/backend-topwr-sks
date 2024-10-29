import axios from 'axios'
import * as cheerio from 'cheerio'
import Meal, { MealCategory } from '#models/meal'

export async function scrapeMenu() {
  const url = 'https://sks.pwr.edu.pl/menu/'

  const response = await axios.get(url)
  const $ = cheerio.load(response.data)

  const menuItems: Partial<Meal>[] = []

  $('.category').each((_, category) => {
    const categoryName = $(category).find('.cat_name h2').text().trim()

    $(category)
      .find('.pos ul li')
      .each((__, item) => {
        const itemText = $(item).text().trim().replace(/\s+/g, ' ')

        const price = $(item).find('.price').text().trim()
        const priceNumeric = Number.parseFloat(price)

        const nameMatch = itemText.match(/[\D\s]+/)
        const itemName = nameMatch ? nameMatch[0].trim() : itemText

        const sizeMatch = itemText.match(/\d+(?:g|ml)(?:\/\d+(?:g|ml))?/)
        const itemSize = sizeMatch ? sizeMatch[0].trim() : null

        menuItems.push({
          name: itemName,
          size: itemSize,
          price: priceNumeric,
          category: assignCategories(categoryName),
        })
      })
  })

  return menuItems
}

function assignCategories(category: string) {
  switch (category) {
    case 'Surówki':
      return MealCategory.SALAD
    case 'Zupy':
      return MealCategory.SOUP
    case 'Dania jarskie':
      return MealCategory.VEGETARIAN_DISH
    case 'Dania mięsne':
      return MealCategory.MEAT_DISH
    case 'Dodatki':
      return MealCategory.SIDE_DISH
    case 'Desery':
      return MealCategory.DESSERT
    case 'Kompoty i napoje':
      return MealCategory.DRINK
    default:
      return null
  }
}
