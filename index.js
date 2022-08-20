const express = require('express');
const { google } = require('googleapis');
const app = express();

app.get('/', async (req, res) => {
  // res.send('Hello World!');
  const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
  });

  // Create client instance for auth
  const client = await auth.getClient();

  // Instance of Google Sheets API
  const googleSheets = google.sheets({ version: 'v4', auth: client });
  const spreadsheetId = '1Ruc9qdOh2k_NiafWV5GDlq84lif-qYReurdWwDYc5Pk';

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
    range: 'Sheet1!A:B',
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [
        ['Amalia Galindo Gakis', '25.12.10'],
        ['Paloma Galindo Gakis', '08.07.15'],
      ],
    },
  });
  res.send(getRows.data);
});

app.listen(1337, () => console.log('Example app listening on port 1337!'));
