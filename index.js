'use strict';
const fs = require('fs');
const Cleverbot = require('cleverbot-node');
const cleverbot = new Cleverbot;
const axios = require('axios');
const Discord = require('discord.js');
const schedule = require('node-schedule');

const { fetchCurrentMenus } = require('./campina');

const bot = new Discord.Client();
const token = require('./token.json').token;

console.log("Booting up...");

bot.on('ready', () => {
    console.log('I am ready! Discord.js ver ' + Discord.version);
});

function createCurrentMenuOutput(menusObj) {
    let date = new Date();
    let showTomorrowsMenu = date.getHours() > 14;
    let weekDayFromMonday = new Date().getDay() - 1; // Date.getDay() starts at sunday
    let menu = menusObj.getMenuForWeekday(showTomorrowsMenu ? weekDayFromMonday + 1 : weekDayFromMonday);
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

bot.on('message', async message => {
    console.log('message received: ' + message.content + " on channel " + message.channel.id);
    if (message.content.startsWith('!ping')) {
        message.reply('Pong.');
    }

    if (message.content.startsWith('!help')) {
        message.reply('Campina Bot Commands: `!ping`, `!menu`');
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

// Scheduling
schedule.scheduleJob({hour: 09, minute: 00}, async () => {
    try {
        for (let guild of bot.guilds.values()) {
            console.log(`Sending daily message to ${guild}`)
            let channel = await getDefaultChannel(guild);
            if (!channel)
                continue;
            
            let result = await fetchCurrentMenus();
            channel.send(createCurrentMenuOutput(result));
        }
    }
    catch (err) {
        console.error(`Error while sending daily message: ${err}`);
    }
});

bot.login(token);