import express from 'express';
import { response } from 'express';
import { chat_v1, google } from 'googleapis';
import fetch from 'node-fetch';
import 'dotenv/config'; // loads env variables from .env file
import cron from 'node-cron';

// AWS Secret Manager
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const secret_name = 'node_request';

const client = new SecretsManagerClient({
  region: 'eu-central-1',
});

// if is development use env variables from .env file and make them global
if (process.env.NODE_ENV === 'development') {
  const {
    PORT,
    IDEALO_CLIENT_ID,
    IDEALO_CLIENT_SECRET,
    GOOGLE_SPREADSHEET_ID,
    AWIN_ADVERTISER_ID,
    AWIN_OAUTH_TOKEN,
    AWIN_OAUTH2_TOKEN,
  } = process.env;
  global.PORT = PORT;
  global.IDEALO_CLIENT_ID = IDEALO_CLIENT_ID;
  global.IDEALO_CLIENT_SECRET = IDEALO_CLIENT_SECRET;
  global.GOOGLE_SPREADSHEET_ID = GOOGLE_SPREADSHEET_ID;
  global.AWIN_ADVERTISER_ID = AWIN_ADVERTISER_ID;
  global.AWIN_OAUTH_TOKEN = AWIN_OAUTH_TOKEN;
  global.AWIN_OAUTH2_TOKEN = AWIN_OAUTH2_TOKEN;
}

const app = express();
// define port for server
const port = process.env.PORT || 1553;

app.get('/', async (req, res) => {
  // run cron job every 24 hours
  // cron.schedule('0 0 * * *', async () => {
  // cron.schedule('*/30 * * * * *', async () => {
  // cron.schedule('*/1 * * * *', async () => {
  console.log('running a task every minute');

  // ================ Idealo click report =================
  const idealo_download_click_report = await downloadClickReport();
  // convert csv data to an array
  const CSVToArray = (data, delimiter = ',', omitFirstRow = false) =>
    data
      .slice(omitFirstRow ? data.indexOf('\n') + 1 : 0)
      .split('\n')
      .map((v) => v.split(delimiter));

  const result = CSVToArray(idealo_download_click_report, ';', true);
  // remove last 2 (not necessary) arrays from result array
  const idealo_click_result = result.slice(0, 2);
  // if date exist in array convert them tp dd.mm.yyyy format
  idealo_click_result.forEach((element) => {
    if (element[0]) {
      element[0] = new Date(element[0]).toLocaleDateString('de-DE');
    }
  });
  // if cost exist format data
  idealo_click_result.forEach((element) => {
    if (element[2]) {
      // remove EUR from cost
      element[2] = element[2].replace('EUR', '');
      // convert point to comma from cost
      element[2] = element[2].replace('.', ',');
      // remove whitespace from cost
      element[2] = element[2].trim();
    }
  });

  // ================ Awin click report =================
  const awin_click_report = await getAwinClickReport();
  const awin_click_result = awin_click_report.map(
    ({
      transactionDate,
      saleAmount: { amount: saleAmount },
      commissionAmount: { amount: commissionAmount },
    }) => {
      return [
        transactionDate.slice(0, 10),
        transactionDate,
        saleAmount,
        commissionAmount,
      ];
    }
  );
  // sum of all item.saleAmount.amount and item.commissionAmount.amount values sorted by date
  const awin_click_result_sum = awin_click_result.reduce((acc, item) => {
    if (!acc[item[0]]) {
      acc[item[0]] = {
        date: item[0],
        saleAmount: 0,
        commissionAmount: 0,
      };
    }
    acc[item[0]].saleAmount += item[2];
    acc[item[0]].commissionAmount += item[3];
    return acc;
  }, {});

  const awin_click_result_sum_object = Object.values(awin_click_result_sum);
  // convert awin_click_result_sum_array to array sorted by date
  const awin_click_result_sum_array = awin_click_result_sum_object.map(
    (item) => {
      return [item.date, item.saleAmount, item.commissionAmount];
    }
  );

  // if date exist in array convert them tp dd.mm.yyyy format
  awin_click_result_sum_array.forEach((element) => {
    if (element[0]) {
      element[0] = new Date(element[0]).toLocaleDateString('de-DE');
    }

    // if saleAmount exist format data
    if (element[1]) {
      element[1] = element[1].toFixed(2);
      element[1] = element[1].replace('.', ',');
      // add a dot after 3rd number
      element[1] = element[1].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    }
    // if commissionAmount exist format data
    if (element[2]) {
      element[2] = element[2].toFixed(2);
      element[2] = element[2].replace('.', ',');
      // add a dot after 3rd number
      element[2] = element[2].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    }
  });

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

  // Get metadata about spreadsheets
  const metaData = await googleSheets.spreadsheets.get({
    auth,
    spreadsheetId,
  });

  // Read rows from Idealo spreadsheet
  const getIdealoRows = await googleSheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    // range: 'Idealo!A2:C',
    range: 'Idealo',
  });

  // Read rows from Awin spreadsheet
  const getAwinRows = await googleSheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range: 'Awin',
  });

  // convert last array of getIdealoRows.data and last array of idealo_click_result to json and check if the are equal
  const getIdealoRows_last_array_json = JSON.stringify(
    getIdealoRows.data.values[getIdealoRows.data.values.length - 1]
  );
  const idealo_click_result_last_array_json = JSON.stringify(
    idealo_click_result[idealo_click_result.length - 2]
  );

  if (getIdealoRows_last_array_json !== idealo_click_result_last_array_json) {
    console.log('New data in idealo_click_result');

    // Update Idealo spreadsheet
    await googleSheets.spreadsheets.values.append({
      auth,
      spreadsheetId,
      range: 'Idealo!A:Z',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: idealo_click_result,
      },
    });
  } else {
    console.log('idealo_click_result is up to date');
  }

  // convert last array of getAwinRows.data to json
  const getAwinRows_last_array_json = JSON.stringify(
    getAwinRows.data.values[getAwinRows.data.values.length - 1]
  );

  // convert last array of awin_click_result_sum_array to json
  const awin_click_result_sum_array_last_array = JSON.stringify(
    awin_click_result_sum_array[awin_click_result_sum_array.length - 1]
  );

  if (getAwinRows_last_array_json !== awin_click_result_sum_array_last_array) {
    // write awin click report to google spreadsheet
    await googleSheets.spreadsheets.values.append({
      auth,
      spreadsheetId,
      range: 'Awin!A:Z',

      valueInputOption: 'USER_ENTERED',
      resource: {
        values: awin_click_result_sum_array,
      },
    });
  } else {
    console.log('awin_click_result_sum is up to date');
  }

  // get all rows from awin and idealo google spreadsheets
  const idealo_rows = getIdealoRows.data.values;
  const awin_rows = getAwinRows.data.values;
  // res.send(getRows.data);
  res.send({ idealo_rows, awin_rows });
  // }); //cron job
});

//  ======================  Awin API  ===============================
async function getAwinClickReport() {
  const date_to = new Date(new Date().setDate(new Date().getDate() - 1))
    .toISOString()
    .slice(0, 10);

  const date_from = new Date(new Date().setDate(new Date().getDate() - 2))
    .toISOString()
    .slice(0, 10);

  const response = await fetch(
    `https://api.awin.com/advertisers/${AWIN_ADVERTISER_ID}/transactions/?startDate=${date_from}T00%3A00%3A00&endDate=${date_to}T00%3A00%3A00&timezone=UTC`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AWIN_OAUTH2_TOKEN}`,
      },
    }
  );
  const data = await response.json();
  // sort by date
  const sorted_awin_data = data.sort((a, b) => {
    return new Date(a.transactionDate) - new Date(b.transactionDate);
  });
  return sorted_awin_data;
  // return await response.json();
}
//  ======================  Idealo API  ===============================

// create idealo access token
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

// download idealo click report
async function downloadClickReport() {
  const idealo_data = await generateAccessTokenFetch();

  const date_to = new Date(new Date().setDate(new Date().getDate() - 2))
    .toISOString()
    .slice(0, 10);

  const date_from = new Date(new Date().setDate(new Date().getDate() - 2))
    .toISOString()
    .slice(0, 10);

  const response = await fetch(
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
