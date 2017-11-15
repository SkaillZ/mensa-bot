'use strict';
const axios = require('axios');
const Discord = require('discord.js');
const schedule = require('node-schedule');

const { fetchCurrentMenus } = require('./campina');

const bot = new Discord.Client();
const pkg = require('./package.json');
const token = require('./token.json').token;

console.log('Booting up...');

bot.on('ready', () => {
    console.log(`I am ready! Campina Bot v${pkg.version}, Discord.js v${Discord.version}`);
});

function getDisplayedWeekday() {
    let date = new Date();
    let showTomorrowsMenu = date.getHours() > 14;
    let weekDayFromMonday = new Date().getDay() - 1; // Date.getDay() starts at sunday
    return showTomorrowsMenu ? weekDayFromMonday + 1 : weekDayFromMonday;
}

function createCurrentMenuOutput(menusObj) {
    let menu = menusObj.getMenuForWeekday(getDisplayedWeekday());
    if (menu) {
        return `🍽 ${showTomorrowsMenu ? 'Tomorrow' : 'Today'}'s menu 🍔\n${menu.toString()}`;
    }
    else {
        throw new Error(`I couldn't find a menu for ${showTomorrowsMenu ? 'tomorrow' : 'today'}. `
            + `Try '!menus' to see info for the entire week.`);
    }
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
            let result = await fetchCurrentMenus();
            message.reply(`🍽 This week's menus 🍔\n${result.toString()}`);
        }
        catch (err) {
            message.reply(`${err}`);
        }
        finally {
            message.channel.stopTyping();
        }
        return; // Avoid falling down to !menu
    }

    if (message.content.startsWith('!menu')) {
        message.channel.startTyping();

        try {
            let result = await fetchCurrentMenus();
            message.reply(createCurrentMenuOutput(result));
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
    let result = await fetchCurrentMenus();
    displayMainDishes(result);

    // Scheduling
    schedule.scheduleJob({hour: 9, minute: 0}, async () => {
        try {
            let result = await fetchCurrentMenus();
            displayMainDishes(result);

            for (let guild of bot.guilds.values()) {
                console.log(`Sending daily message to ${guild}`)
                let channel = await getDefaultChannel(guild);
                if (!channel)
                    continue;
                
                channel.send(createCurrentMenuOutput(result));
            }
        }
        catch (err) {
            console.error(`Error while sending daily message: ${err}`);
        }
    });
});

bot.login(token);