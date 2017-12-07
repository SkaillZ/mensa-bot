'use strict';
function getDisplayedWeekday() {
    // let showTomorrowsMenu = date.getHours() > 14;
    let showTomorrowsMenu = false;
    let weekDayFromMonday = new Date().getDay() - 1; // Date.getDay() starts at sunday
    return showTomorrowsMenu ? weekDayFromMonday + 1 : weekDayFromMonday;
}

module.exports = {
    getDisplayedWeekday
};