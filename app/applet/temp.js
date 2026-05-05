const fetch = require('node-fetch');

async function test() {
  const res = await fetch('https://www.namesilo.com/api/checkRegisterAvailability?version=1&type=xml&key=12345&domains=revtray-test-9999.com');
  const text = await res.text();
  console.log(text);
}
test();
