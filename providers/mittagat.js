'use strict';
const axios = require('axios');
const cheerio = require('cheerio');

const { getDisplayedWeekday } = require('../util');
const { Menu, WeeklyMenu, DailyMenu, GERMAN_WEEKDAYS } = require('../models');

const baseUrl = 'https://www.mittag.at/api/2/restaurant/';

async function fetchCurrentMenusFor(relativeUrl, token) {
    console.log(`${baseUrl}?id=${relativeUrl}`);
    let response = await axios.get(baseUrl + relativeUrl, {
        headers: {'Authorization': `Bearer ${token}`}
    });

    let menu = response.data.menu || '';
    menu = menu.replace(/^\s*[\r\n]/gm, ''); // Get rid of empty lines

    return new WeeklyMenu([
        new DailyMenu(getDisplayedWeekday(), menu)
    ]);
}

module.exports = {
    forPage: function(relativeUrl, name, updateDays) {
        return {
            name: name || relativeUrl,
            updateDays: [],
            fetchCurrentMenus: token => fetchCurrentMenusFor(relativeUrl, token)
        };
    }
}
