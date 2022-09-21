// const express = require('express');
import express from 'express';

// const { response } = require('express');
import { response } from 'express';

// const { google } = require('googleapis');
import { google } from 'googleapis';

// const fetch = require('node-fetch');
import fetch from 'node-fetch';

const app = express();

import 'dotenv/config'; // loads env variables from .env file
// const dotenv = require('dotenv/config');

const { PORT, IDEALO_CLIENT_ID, IDEALO_CLIENT_SECRET, GOOGLE_SPREADSHEET_ID } =
  process.env;

// define port for server
const port = process.env.PORT || 1553;
console.log(PORT);

app.get('/', async (req, res) => {
  // res.send('Hello World!');
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
    range: 'Sheet1!A:B',
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [
        ['Amalia Galindo Gakis', '25.12.10'],
        ['Paloma Galindo Gakis', '08.07.15'],
        ['Maria Gakis', '08.07.77'],
        ['Marina GaGA', '08.07.77'],
        ['Amalia Galindo Gakis', '25.12.10'],
      ],
    },
  });
  res.send(getRows.data);
});

console.log('port: ', port);

app.listen(port, () => console.log('App listening on port ' + port));
