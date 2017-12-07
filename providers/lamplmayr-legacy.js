'use strict';

const { Menu, WeeklyMenu, DailyMenu, GERMAN_WEEKDAYS } = require('../models');

async function fetchCurrentMenus() {
    return Promise.resolve(new WeeklyMenu([
        new DailyMenu(0, [new Menu(['Heute ist Schnitzeltag'])])
    ]));
}

module.exports = {
    name: 'Lamplmayr',
    updateDays: [],
    fetchCurrentMenus
}