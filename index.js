const {
    REST,
    Routes,
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActivityType,
    Partials,
    Events
} = require("discord.js");

const path = require("path");
require("dotenv").config();
const fs = require("fs");
const http = require("http");

const client = new Client({
    allowedMentions: false,
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [
        Partials.User,
        Partials.Channel,
        Partials.GuildMember,
        Partials.Reaction,
    ]
});

let commandMap = new Map();

function loadCommands() {
    const commandsPath = path.join(__dirname, 'interactions');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        try {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            commandMap.set(command.data.name, command);
            console.log(`Loaded command '${command.data.name}'`);
        } catch (err) {
            console.log(err);
        }
    }
}

function deployCommands() {
    const commands = [];
    const commandsPath = path.join(__dirname, 'interactions');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    rest.put(Routes.applicationGuildCommands(client.user.id, process.env.GuildID), { body: commands })
        .then(() => console.log('Successfully registered application commands.'))
        .catch((err) => console.log(err));
}

client.on("ready", () => {
    console.log("Client Ready");
    console.log(`Logged in as: ${client.user.tag}`);
    client.user.setPresence({ 
        activities: [{ name: `over obfuscation`, type: ActivityType.Watching }] 
    });
});

// FIX BUG: Ganti "command" dengan "commandMap.get()"
client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isCommand() && commandMap.has(interaction.commandName)) {
        try {
            const command = commandMap.get(interaction.commandName); // FIX!
            command.execute(interaction, interaction.member, client);
        } catch (e) {
            console.log(`Error in command ${interaction.commandName}: ${e}`);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Execution Error")
                        .setDescription(`An error occurred executing Command: \`${interaction.commandName}\`.`)
                        .setColor("#2f3136")
                        .setTimestamp()
                ], 
                ephemeral: true
            });
        }
    }
});

client.login(process.env.TOKEN).then(() => {
    console.log("Logged In");
    deployCommands();
    loadCommands();
}).catch((err) => {
    console.log(err);
});

// ============================================
// HEALTH CHECK SERVER UNTUK RENDER
// ============================================
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot is running!');
});

server.listen(process.env.PORT || 3000, () => {
    console.log('Health check server running on port ' + (process.env.PORT || 3000));
});
