# Data Aggregation and Reporting Service

This service aggregates data from Idealo and Awin APIs, processes it, and updates Google Sheets with the formatted data. The service uses Express.js for handling HTTP requests, and integrates with Google Sheets API, Idealo API, and Awin API.

## Technologies Used

- **Express.js**: Web framework for Node.js.
- **Google Sheets API**: For reading and writing data to Google Sheets.
- **Idealo API**: For fetching click reports.
- **Awin API**: For fetching transaction data.
- **node-fetch**: For making HTTP requests.
- **dotenv**: For loading environment variables from a `.env` file.
- **node-cron**: For scheduling tasks.

## Installation

1. Clone the repository.
2. Install the dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add the following environment variables:

   ```plaintext
   NODE_ENV=development
   PORT=3000
   IDEALO_CLIENT_ID=your_idealo_client_id
   IDEALO_CLIENT_SECRET=your_idealo_client_secret
   GOOGLE_SPREADSHEET_ID=your_google_spreadsheet_id
   AWIN_ADVERTISER_ID=your_awin_advertiser_id
   AWIN_OAUTH_TOKEN=your_awin_oauth_token
   AWIN_OAUTH2_TOKEN=your_awin_oauth2_token
   ```

4. Ensure you have the `google-credentials.json` file with the necessary credentials for accessing the Google Sheets API.

## Usage

1. Start the server:

   ```bash
   npm start
   ```

2. The server will run on `http://localhost:3000`.

3. To fetch and update the data immediately, send a GET request to the root endpoint:

   ```plaintext
   GET http://localhost:3000/
   ```

## Scheduled Tasks

- The service is set to fetch and update the data every 24 hours at 00:01 using `node-cron`.

## Data Processing

- **Idealo Data**: Click reports are fetched, parsed from CSV to an array, and formatted (date and cost).
- **Awin Data**: Transaction data is fetched, aggregated by date, and formatted (sale amount and commission amount).

## Google Sheets Integration

- The service reads data from the specified Google Sheets and checks if the new data is already present.
- If new data is available, it appends the data to the respective sheets (`Idealo` and `Awin`).

## Key Functions

### handleGetRequest

Handles the main data fetching and processing logic, and updates Google Sheets with the formatted data.

### getAwinClickReport

Fetches and processes Awin transaction data, sorting it by date.

### generateAccessTokenFetch

Generates an access token for the Idealo API.

### downloadClickReport

Downloads the Idealo click report CSV and returns it as text.

## Development

- The application is configured to use environment variables for sensitive information.
- When in development mode, environment variables are loaded from the `.env` file and made globally accessible.

## Run node app

`node app.js`
