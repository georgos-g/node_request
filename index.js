import express from 'express';
import { response } from 'express';
import { google } from 'googleapis';
import fetch from 'node-fetch';
import 'dotenv/config'; // loads env variables from .env file
import cron from 'node-cron';

const app = express();

const {
  PORT,
  IDEALO_CLIENT_ID,
  IDEALO_CLIENT_SECRET,
  GOOGLE_SPREADSHEET_ID,
  AWIN_ADVERTISER_ID,
  AWIN_OAUTH_TOKEN,
  AWIN_OAUTH2_TOKEN,
} = process.env;

// define port for server
const port = process.env.PORT || 1553;

app.get('/', async (req, res) => {
  // ==================== Idealo API =====================
  // run cron job every 15 seconds
  // cron.schedule('*/30 * * * * *', async () => {
  // cron.schedule('*/1 * * * *', async () => {
  console.log('running a task every minute');

  const idealo_download_click_report = await downloadClickReport();
  const CSVToArray = (data, delimiter = ',', omitFirstRow = false) =>
    data
      .slice(omitFirstRow ? data.indexOf('\n') + 1 : 0)
      .split('\n')
      .map((v) => v.split(delimiter));

  const result = CSVToArray(idealo_download_click_report, ';', true);
  // remove last 2 arrays from result array
  const idealo_click_result = result.slice(0, 2).reverse();
  // if date exist in array convert them tp dd.mm.yyyy format
  idealo_click_result.forEach((element) => {
    if (element[0]) {
      element[0] = new Date(element[0]).toLocaleDateString('de-DE');
    }
  });

  console.log('result: ', idealo_click_result);

  //  ======================  Google Sheets API  ==========================

  const auth = new google.auth.GoogleAuth({
    keyFile: 'google-credentials.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
  });

  // Create client instance for auth
  const client = await auth.getClient();

  // Instance of Google Sheets API
  const googleSheets = google.sheets({ version: 'v4', auth: client });
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  // Ger metadata about spreadsheets
  const metaData = await googleSheets.spreadsheets.get({
    auth,
    spreadsheetId,
  });

  // Read rows from spreadsheet
  const getRows = await googleSheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range: 'Idealo',
  });

  // Append data to first row of the google spreadsheet

  await googleSheets.spreadsheets.values.append({
    // insert data before the second row of the google spreadsheet
    auth,
    spreadsheetId,
    range: 'Idealo!A:Z',

    valueInputOption: 'USER_ENTERED',
    resource: {
      // values: idealo_click_result,
      // [
      // ['Luisa  ', '08.07.77', 'München'],
      // ],
    },
  });
  res.send(getRows.data);
  // });
});

//  ======================  Idealo API  ===============================

// get idealo access token
async function generateAccessTokenFetch() {
  const response = await fetch(
    'https://businessapi.idealo.com/api/v1/oauth/token',
    {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(IDEALO_CLIENT_ID + ':' + IDEALO_CLIENT_SECRET).toString(
            'base64'
          ),
      },
    }
  );
  return await response.json();
}

// // create idealo click report
// async function startClickReport() {
//   const idealo_data = await generateAccessTokenFetch();
//   // const today = new Date().toISOString().slice(0, 10);
//   const today = new Date(new Date().setDate(new Date().getDate() - 2))
//     .toISOString()
//     .slice(0, 10);
//   console.log('today: ', today);
//   const yesterday = new Date(new Date().setDate(new Date().getDate() - 3))
//     .toISOString()
//     .slice(0, 10);
//   console.log('yesterday: ', yesterday);

//   const response = await fetch(
//     `https://businessapi.idealo.com/api/v1/shops/${idealo_data.shop_id}/click-reports`,
//     {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${idealo_data.access_token}`,
//       },
//       body: JSON.stringify({
//         from: yesterday,
//         to: today,
//       }),
//     }
//   );
//   return await response.json();
// }

// download click report
async function downloadClickReport() {
  const idealo_data = await generateAccessTokenFetch();
  // const idealo_click_report = await startClickReport();
  // console.log('idealo_click_report.id: ', idealo_click_report.id);

  const date_to = new Date(new Date().setDate(new Date().getDate() - 1))
    .toISOString()
    .slice(0, 10);

  // console.log('today: ', today);
  const date_from = new Date(new Date().setDate(new Date().getDate() - 2))
    .toISOString()
    .slice(0, 10);

  console.log('date_from: ', date_from);

  const response = await fetch(
    // `https://businessapi.idealo.com/api/v1/shops/${idealo_data.shop_id}/daily-click-reports/${idealo_click_report.id}/download`,
    `https://businessapi.idealo.com/api/v1/shops/${idealo_data.shop_id}/daily-click-reports/download?from=${date_from}&to=${date_to}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/csv',
        Authorization: `Bearer ${idealo_data.access_token}`,
      },
    }
  );
  // download csv file
  return await response.text();
}

app.listen(port, () => console.log('App listening on port ' + port));
