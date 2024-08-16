import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { html, raw } from 'hono/html';
import { parse } from 'marked';
import fs from 'node:fs';

import { getWeather } from './api.js';
import { generate } from './groq.js';

const app = new Hono();

app.use('/img/*', serveStatic({ root: './' }));

app.use(async function (ctx, next) {
  ctx.setRenderer(function (content) {
    const template = fs
      .readFileSync('./template.html', 'utf-8')
      .replace('{{content}}', content);
    return ctx.html(template);
  });
  await next();
});

app.get('/health', function (ctx) {
  return ctx.text('OK');
});

app.get('/', async function (ctx) {
  // Extract the location from the query parameters
  const location = ctx.req.query('location') || 'Jakarta';

  // Fetch weather information for the selected location
  const weather = await getWeather(location);
  const prompt = `You are an awesome weather reporter. Generate a report for today's weather in ${location} based on data below:
- temperature: ${weather.temp}
- humidity: ${weather.humidity}
- wind speed: ${weather.windspeed}
- maximum temperature: ${weather.maxTemp}

Give a recommendation on what to wear, what to bring, and any activities that are suitable for the weather. Make the report short, funny and engaging.
`;

  const comment = await generate(prompt);

  return ctx.render(
    html`<div class="weathers">
      <label for="Location">Choose a location:</label>

      <select name="Location" id="Location">
        <option value="Jakarta" ${location === 'Jakarta' ? 'selected' : ''}>
          Jakarta
        </option>
        <option value="Surabaya" ${location === 'Surabaya' ? 'selected' : ''}>
          Surabaya
        </option>
        <option value="Singapore" ${location === 'Singapore' ? 'selected' : ''}>
          Singapore
        </option>
        <option value="London" ${location === 'London' ? 'selected' : ''}>
          London
        </option>
      </select>

      <button type="submit" onclick="submitForm()">Submit</button>
      <h1 id="locationDisplay">${location}</h1>
      <div id="weather">
        <div class="info">
          <div class="icon">
            <img src="img/${weather.icon}.png" />
          </div>
          <div class="text">
            <ul id="report">
              <li>Temperature: <span id="temp">${weather.temp}°C</span></li>
              <li>Humidity: <span id="humidity">${weather.humidity}%</span></li>
              <li>Wind Speed: <span id="uv">${weather.windspeed}</span></li>
            </ul>
          </div>
        </div>
      </div>
      <div id="comment">${raw(parse(comment))}</div>
      <script>
        function submitForm() {
          const location = document.getElementById('Location').value;
          window.location.href = '/?location=' + encodeURIComponent(location);
        }
      </script>
    </div>`
  );
});

// Serve the application on port 3000
serve({ fetch: app.fetch, port: 3000 });
console.log('Listening on http://localhost:3000');
