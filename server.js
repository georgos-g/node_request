import express from 'express';
import fetch from 'node-fetch';
import 'dotenv/config'; // loads env variables from .env file

const { IDEALO_CLIENT_ID, IDEALO_CLIENT_SECRET } = process.env;

const base = 'https://businessapi.idealo.com';

const app = express();

// test route
app.get('/test', async (req, res) => {
  const data = await generateAccessTokenFetch();
  console.log(data);
  res.json(data);
});

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
  const data = await response.json();
  return data;
}
// export data from generateAccessTokenFetch
export default app;

// app.listen(3000);
