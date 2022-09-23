import express from 'express';
import { response } from 'express';
import { google } from 'googleapis';
import fetch from 'node-fetch';
import 'dotenv/config'; // loads env variables from .env file

const app = express();

const { PORT, IDEALO_CLIENT_ID, IDEALO_CLIENT_SECRET, GOOGLE_SPREADSHEET_ID } =
  process.env;

// define port for server
const port = process.env.PORT || 1553;

app.get('/', async (req, res) => {
  // Idealo API access token
  const idealo_data = await generateAccessTokenFetch();
  // res.json(idealo_data);
  console.log('IDEALO:::', idealo_data.access_token);

  const idealo_click_data = await startClickReport();
  console.log('idealo_click_data:::::: ', idealo_click_data);

  //  ======================  Google Sheets API  ===============================

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
    range: 'Sheet1',
  });

  // Append rows to spreadsheet
  await googleSheets.spreadsheets.values.append({
    auth,
    spreadsheetId,
    range: 'Sheet1!A:B:C',
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [
        ['Amalia', '25.12.10', 'Berlin'],
        ['Paloma ', '08.07.15', 'Hamburg'],
        ['Elena  ', '08.07.77', 'München'],
      ],
    },
  });
  res.send(getRows.data);
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
  const idealo_data = await response.json();
  return idealo_data;
}

// start idealo click report
async function startClickReport() {
  const idealo_data = await generateAccessTokenFetch();
  console.log('idealo_data____: ', idealo_data.access_token);

  const response = await fetch(
    'https://businessapi.idealo.com/api/v1/shops/12345/daily-click-reports/download?from=2020-09-01&to=2020-09-02',
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `'Bearer ${idealo_data.access_token}'`,
      },
      // body: JSON.stringify({
      //   from: '2020-09-19',
      //   to: '2020-09-20',
      // }),
    }
  );

  // const idealo_click_data = await response.json();
  const idealo_click_data = await response;
  return idealo_click_data;
}

app.listen(port, () => console.log('App listening on port ' + port));
