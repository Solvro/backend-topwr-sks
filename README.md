# SKS Menu Scrapper

![Solvro banner](./assets/solvro_dark.png#gh-dark-mode-only)
![Solvro banner](./assets/solvro_light.png#gh-light-mode-only)

## Description

SKS Menu Scraper is a tool designed to automatically fetch and parse information about canteen menus, such as dish names, portion sizes, and prices. The project saves the scraped data into a database and provides a RESTful API for users to access menu items

## Endpoints

The API is available at `api.topwr.solvro.pl`. The following endpoint is available (more coming soon):

- **GET** `api/v1/meals`
  - Retrieves a list of all menu items, including dish names, sizes, and prices.
  - Note: If the SKS site does not display the menu, this endpoint returns an empty list.
  - **Example**: `curl -X GET https://api.topwr.solvro.pl/api/v1/meals`

## Development

1. Clone the repository:

   ```bash
   git clone https://github.com/Solvro/backend-topwr-sks.git
   cd backend-topwr-sks
   ```

2. Install the required dependencies:

   ```bash
   npm install
   ```

3. Set up the PostgreSQL database:

   - Ensure PostgreSQL is installed and running.
   - Create a new database.
   - Update the `.env` file with your PostgreSQL credentials and database name.

4. Set up the environment variables in the `.env` file using the `.env.example` template.

5. Run migrations to create the database schema:

   ```bash
   node ace migration:run
   ```

6. Run scheduler for scrapper:

   ```bash
    node ace scheduler:run
    # or
    node ace scheduler:work
   ```

   Alternatively run scraping script once:

   ```bash
   node ace scrape
   ```

7. Start the development server:

   ```bash
   npm run dev
   ```

8. Access the data using:

   ```bash
   curl -X GET http://localhost:3333/api/v1/meals
   ```

## Technologies

- Node.js
- Adonis.js
- PostgreSQL
- Coolify

## Database Schema

![schema](./assets/schema.png)
