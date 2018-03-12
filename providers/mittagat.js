'use strict';
const axios = require('axios');
const cheerio = require('cheerio');

const { getDisplayedWeekday } = require('../util');
const { Menu, WeeklyMenu, DailyMenu, GERMAN_WEEKDAYS } = require('../models');

const baseUrl = 'http://mittag.at/r/';

async function fetchCurrentMenusFor(relativeUrl) {
    let response = await axios.get(baseUrl + relativeUrl);
    let $ = cheerio.load(response.data);

    let currentMenuElem = $('#current-menu .current-menu');
    if (!currentMenuElem || currentMenuElem.length <= 0 || !currentMenuElem.html()) {
        return new WeeklyMenu([]);
    }

    let text = currentMenuElem[0].children
        .filter(elem => elem.name !== 'br' && elem.data.trim() !== '')
        .map(elem => '  ' + elem.data.trim())
        .join('\n');

    return new WeeklyMenu([
        new DailyMenu(getDisplayedWeekday(), text)
    ]);
}

module.exports = {
    forPage: function(relativeUrl, name, updateDays) {
        return {
            name: name || relativeUrl,
            updateDays: [],
            fetchCurrentMenus: () => fetchCurrentMenusFor(relativeUrl)
        };
    }
}