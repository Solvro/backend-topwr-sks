import { test } from '@japa/runner'
import nock from 'nock'
import { expectedResponse } from '#tests/fixtures/parsed_menu_expected_response'
import { scrapeMenu } from '../../../scripts/menu_scrapper.js'
import { url } from '../../../scripts/menu_scrapper.js'

test.group('Menu scrapper scrape menu', () => {
  test('should parse the external menu response', async ({ assert }) => {
    nock(url).get('/').replyWithFile(200, './tests/fixtures/external_menu_response.html', {
      'Content-Type': 'text/html; charset=UTF-8',
    })

    const response = await scrapeMenu()
    assert.deepEqual(response, expectedResponse)
  })
})
