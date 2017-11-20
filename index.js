'use strict';
const axios = require('axios');
const Discord = require('discord.js');
const schedule = require('node-schedule');

const CampinaProvider = require('./providers/campina');
const LamplmayrProvider = require('./providers/lamplmayr');
const providers = [CampinaProvider, LamplmayrProvider];

const bot = new Discord.Client();
const pkg = require('./package.json');
const token = require('./token.json').token;

console.log('Booting up...');

bot.on('ready', () => {
    console.log(`I am ready! Campina Bot v${pkg.version}, Discord.js version: ${Discord.version}`);
});

function getResultsFromAllProviders() {
    return Promise.all(providers.map(async pr => await pr.fetchCurrentMenus()));
}

function getDisplayedWeekday() {
    let date = new Date();
    let showTomorrowsMenu = date.getHours() > 14;
    let weekDayFromMonday = new Date().getDay() - 1; // Date.getDay() starts at sunday
    return showTomorrowsMenu ? weekDayFromMonday + 1 : weekDayFromMonday;
}

function createCurrentMenuOutput(menus) {
    let showTomorrowsMenu = new Date().getHours() > 14;
    let weekDay = getDisplayedWeekday();
    let output = `🍽 ${showTomorrowsMenu ? 'Morgige' : 'Heutige'}s Menü 🍔\n`;
    let anyMenu = false;

    for (let [index, weeklyMenu] of menus.entries()) {
        let menu = weeklyMenu.getMenuForWeekday(weekDay);
        let provider = providers[index];
        if (menu) {
            anyMenu = true;
            output += `\n**${provider.name}**\n`;
            output += `${menu.toString()}\n`;
            if (provider.updateDays.includes(weekDay)) {
                // TODO: introduce a way to detect this automatically
                output += `\n⚠ Es könnten Informationen von '${provider.name}' aus der letzten Woche angezeigt werden.\n`;
            }
        }
    }

    if (!anyMenu) {
        throw new Error(`Ich kann kein Menü für ${showTomorrowsMenu ? 'morgen' : 'heute'} finden. `
            + `Gib '!menus' ein, um Informationen für die gesamte Woche anzuzeigen.\n`);
    }

    return output;
}

// https://github.com/AnIdiotsGuide/discordjs-bot-guide/blob/master/frequently-asked-questions.md#default-channel
async function getDefaultChannel(guild) {
    // get "original" default channel
    if (guild.channels.has(guild.id))
        return guild.channels.get(guild.id)

    // Check for a "mensa" channel
    if (guild.channels.exists("name", "mensa"))
        return guild.channels.find("name", "mensa");

    // Check for a "general" channel, which is often default chat
    if (guild.channels.exists("name", "general"))
        return guild.channels.find("name", "general");

    // Now we get into the heavy stuff: first channel in order where the bot can speak
    // hold on to your hats!
    return guild.channels
        .filter(c => c.type === "text" &&
            c.permissionsFor(guild.client.user).has("SEND_MESSAGES"))
        .sort((a, b) => a.position - b.position ||
            Long.fromString(a.id).sub(Long.fromString(b.id)).toNumber())
        .first();
}

async function displayMainDishes(menusObj) {
    let mainDishes = menusObj.getMenuForWeekday(getDisplayedWeekday()).getMainDishes();
    return bot.user.setGame(mainDishes.join(', '));
}

bot.on('message', async message => {
    console.log('message received: ' + message.content + " on channel " + message.channel.id);
    if (message.content.startsWith('!ping')) {
        message.reply('Pong.');
    }

    if (message.content.startsWith('!help')) {
        message.channel.send(`Campina Bot v${pkg.version}\n`
            + `Commands: \`!ping\`, \`!menu\`, \`!menus\`\n\n`
            + `Repository: ${pkg.repository.url}`);
    }

    if (message.content.startsWith('!menus')) {
        message.channel.startTyping();

        try {
            let results = await getResultsFromAllProviders();

            let output = `🍽 Menüs dieser Woche: 🍔\n`;
            for (let [index, weeklyMenu] of results.entries()) {
                let provider = providers[index];
                output += `\n**${provider.name}**\n`;
                output += `${weeklyMenu.toString()}\n`;
                if (provider.updateDays.includes(getDisplayedWeekday())) {
                    // TODO: introduce a way to detect this automatically
                    output += `\n⚠ Es könnten Informationen von '${provider.name}' aus der letzten Woche angezeigt werden.\n`;
                }
            }
            message.reply(output);
        }
        catch (err) {
            message.reply(err);
        }
        finally {
            message.channel.stopTyping();
        }
        return; // Avoid falling down to !menu
    }

    if (message.content.startsWith('!menu')) {
        message.channel.startTyping();

        try {
            let results = await getResultsFromAllProviders();
            message.reply(createCurrentMenuOutput(results));
        }
        catch (err) {
            message.reply(`${!!err.message ? err.message : err}`);
        }
        finally {
            message.channel.stopTyping();
        }
    }
});

bot.on('ready', async () => {
    // Update main dishes at startup
    let results = await getResultsFromAllProviders();
    displayMainDishes(results[0]);

    // Scheduling
    schedule.scheduleJob({hour: 9, minute: 0}, async () => {
        try {
            let results = await getResultsFromAllProviders();
            displayMainDishes(results[0]);

            for (let guild of bot.guilds.values()) {
                console.log(`Sending daily message to ${guild}`)
                let channel = await getDefaultChannel(guild);
                if (!channel)
                    continue;
                
                channel.send(`@everyone ${createCurrentMenuOutput(results)}`);
            }
        }
        catch (err) {
            console.error(`Error while sending daily message: ${err}`);
        }
    });
});

bot.login(token);