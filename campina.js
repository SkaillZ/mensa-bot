'use strict';
const axios = require('axios');
const PDFParser = require('pdf2json');

async function fetchCurrentMenus() {
    return new Promise(async (resolve, reject) => {
        let response = await axios.get('http://www.loungerie.at/campina/');

        let urlRegex = /(https?:\/\/[^\s\"]+)/g;
        let matchObj;
        let matches = [];
        while (matchObj = urlRegex.exec(response.data)) {
            let match = matchObj[1];
            if (match.toLowerCase().includes('menüplan'))
                matches.push(matchObj[1]);
        }
        if (matches.length === 0) {
            message.reply('no menu found');
            message.channel.stopTyping();                
            return;
        }

        // Fix faulty encoding of "ü"
        // TODO: make this suck less
        let url = matches[0].replace('ü', encodeURIComponent('ü'));
        console.log(`Downloading '${url}'...`);
        let pdfResponse = await axios.get(url, {responseType: 'arraybuffer'});

        const parser = new PDFParser();
        parser.on("pdfParser_dataError", errData => reject(errData.parserError) );

        parser.on("pdfParser_dataReady", pdfData => {
            // http://www.reactiongifs.com/r/mgc.gif
            let texts = pdfData.formImage.Pages[0].Texts.map(text => text.R)
                .reduce((flat, toFlatten) => flat.concat(toFlatten))
                .map(t => decodeURIComponent(t.T));

            const GERMAN_WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
            let dailyMenus = [];

            let currentIndex = -1;
            let menuIndex = -1;
            for (let text of texts) {
                for (let [index, weekDay] of GERMAN_WEEKDAYS.entries()) {
                    if (text.toLowerCase().startsWith(weekDay.toLowerCase())) {
                        currentIndex = index;
                        let menus = [[], []];
                        dailyMenus[currentIndex] = {
                            weekDayName: weekDay,
                            menus,
                            toString: function() {
                                let msg = '';
                                msg += `${weekDay}:\n`
                                for (let [index, menu] of menus.entries()) {
                                    msg += `  Menü ${index+1}\n`;
                                    for (let item of menu) {
                                        msg += `    - ${item}\n`;
                                    }
                                }
                                return msg;
                            }
                        };
                        menuIndex = -1;
                        continue;
                    }
                }

                if (text === "Menü I") {
                    menuIndex = 0;
                    continue;
                }
                if (text === "Menü II") {
                    menuIndex = 1;
                    continue;
                }

                // Skip the rest if the next one is probably a price
                if (text.length < 5 || !isNaN(text[0])) {
                    menuIndex = -1;
                    continue;
                }

                if (currentIndex < 0 || menuIndex < 0)
                    continue;

                if (dailyMenus.length - 1 >= currentIndex && dailyMenus[currentIndex]) {
                    dailyMenus[currentIndex].menus[menuIndex].push(text);
                }
                else {
                    dailyMenus[currentIndex].menus[menuIndex] = [text];
                }
            }

            resolve({
                dailyMenus,
                getMenuForWeekday: weekDay => weekDay >= 0 && weekDay < dailyMenus.length ? dailyMenus[weekDay] : null,
                toString: () => dailyMenus.reduce((str, day) => str += day.toString(), '')
            });
        });
        parser.parseBuffer(pdfResponse.data);
    });
}

module.exports = {
    fetchCurrentMenus
}