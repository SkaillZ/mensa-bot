'use strict';

const { Menu, WeeklyMenu, DailyMenu, GERMAN_WEEKDAYS } = require('../models');

async function fetchCurrentMenus() {
    return Promise.resolve(new WeeklyMenu([
        new DailyMenu(0, [new Menu(['🍺 Heute ist *Seidl-Night* (20.00 - 23.00 Uhr) 🍻'])]),
        new DailyMenu(1, [new Menu(['🍝 Heute ist *Spaghetti-Night* (ab 18.00 Uhr pro Teller € 1,-) 🍽'])]),
        new DailyMenu(2, [new Menu(['🍸 Heute ist *Cocktail-Night* (21.00 - 00.00 Uhr) 🍹'])])
    ]));
}

module.exports = {
    name: 'Loungerie',
    updateDays: [],
    fetchCurrentMenus
}