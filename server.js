import express from 'express';
import fetch from 'node-fetch';
import 'dotenv/config'; // loads env variables from .env file

const { IDEALO_CLIENT_ID, IDEALO_CLIENT_SECRET } = process.env;

const app = express();

// test route
app.get('/', async (req, res) => {
  const idealo_data = await generateAccessTokenFetch();
  console.log(idealo_data);
  res.json(idealo_data);
});

// get idealo click report
async function getClickReport() {
  const idealo_data = await generateAccessTokenFetch();

  const response = await fetch(
    'https://businessapi.idealo.com/api/v1/shops/282197/click-reports',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `'Bearer ${idealo_data.access_token}'`,
      },
      body: JSON.stringify({
        from: '2020-09-01',
        to: '2020-09-20',
      }),
    }
  );

  // const idealo_click_data = await response.json();
  const idealo_click_data = await response;
  return idealo_click_data;
}

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
  // const data = await response.json();
  const idealo_data = await response.json();
  // return data;
  return idealo_data;
}

app.listen(3000);
