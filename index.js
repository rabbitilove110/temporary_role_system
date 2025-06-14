const { Client, Collection, EmbedBuilder } = require('discord.js');
const client = new Client({
    intents: [
        131071,
    ]
});

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
require('dotenv').config();
const token = process.env.token;
const clientID = process.env.clientID;
client.commands = new Collection();
const scheduler = require('./features/scheduler');
const Dokdo = require('dokdo')
const DokdoHandler = new Dokdo.Client(client, { prefix: '!', aliases: ['dokdo', 'dok'], owners: [process.env.ownerID], noPerm: (messageCreate) => messageCreate.reply({ embeds: [
    new EmbedBuilder()
        .setTitle("⛔ㅣ사용불가")
        .setDescription('해당 명령어는 봇 개발자만 사용가능합니다.')
        .setColor('Red')
        .setFooter({ text: '기간제 역할 시스템' })
] }) })

client.on('messageCreate', async (messageCreate) => {
    await DokdoHandler.run(messageCreate)
})

client.once('ready', async () => {
    client.user.setPresence({ activities: [{ name: '기간제 역할 시스템' }] });
    console.log("Bot Connected");
    scheduler.start(client);
})

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    try {
        await command.run(interaction)
    } catch (err) {
        console.error(err);
    }
});

const commandJsonData = [
    ...Array.from(client.commands.values()).map(c => c.data.toJSON())
]

const rest = new REST({ version: 10 }).setToken(token);

(async () => {
    try {
        console.log("slash command registrationning");
        await rest.put(
            Routes.applicationCommands(clientID),
            { body: commandJsonData }
        );
        console.log("slash command registration successful");
    } catch (err) {
        console.error(err);
    }
})();

client.login(token)