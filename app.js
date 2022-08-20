const request = require('request');
request(
  {
    url: 'https://jsonplaceholder.typicode.com/posts/',
    // url: 'https://businessapi.idealo.com/api/v1/100689515818813868445/99ab663de779f7570c149a7c2950cba72b9eea78',
    json: true,
  },
  (err, response, body) => {
    console.log(JSON.stringify(body, undefined, 4));
  }
);
