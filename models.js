const GERMAN_WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

class Menu {
    constructor(dishes = []) {
        this.dishes = dishes;
    }

    getMainDish() {
        if (this.dishes.length === 0)
            return null;

        return this.dishes.length >= 2 ? this.dishes[1] : this.dishes[0];
    }

    toString() {
        return this.dishes.reduce((str, dish) => str += `    • ${dish}\n`, '');
    }
}

class DailyMenu {
    constructor(day, menus = []) {
        this.day = day;
        this.menus = menus;
    }

    getMainDishes() {
        return this.menus.map(menu => menu.getMainDish());
    }

    toString() {
        let msg = '';
        for (let [index, menu] of this.menus.entries()) {
            msg +=`  Menü ${index+1}:\n${menu.toString()}`;
        }
        return msg;
    }
}

class WeeklyMenu {
    constructor(dailyMenus = []) {
        this.dailyMenus = dailyMenus;
    }

    getMenuForWeekday(weekDay) {
        return weekDay >= 0 && weekDay < this.dailyMenus.length ? this.dailyMenus[weekDay] : null;
    }

    toString() {
        return this.dailyMenus.reduce((str, daily) => str += `${GERMAN_WEEKDAYS[daily.day]}\n${daily.toString()}`, ''); 
    }  
}

module.exports = {
    GERMAN_WEEKDAYS,
    Menu,
    DailyMenu,
    WeeklyMenu
};