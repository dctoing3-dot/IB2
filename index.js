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
const http = require("http");
require("dotenv").config();
const fs = require("fs");

if (!process.env.TOKEN) {
    console.error("❌ ERROR: TOKEN tidak ditemukan!");
    process.exit(1);
}

if (!process.env.GuildID) {
    console.error("❌ ERROR: GuildID tidak ditemukan!");
    process.exit(1);
}

const client = new Client({
    allowedMentions: { parse: [] },
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
    
    if (!fs.existsSync(commandsPath)) {
        console.error("❌ Folder 'interactions' tidak ditemukan!");
        return;
    }
    
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        try {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            commandMap.set(command.data.name, command);
            console.log(`✅ Loaded command: ${command.data.name}`);
        } catch (err) {
            console.error(`❌ Error loading ${file}:`, err);
        }
    }
}

function deployCommands() {
    const commands = [];
    const commandsPath = path.join(__dirname, 'interactions');
    
    if (!fs.existsSync(commandsPath)) return;
    
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        try {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            commands.push(command.data.toJSON());
        } catch (err) {
            console.error(`❌ Error reading ${file}:`, err);
        }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    rest.put(Routes.applicationGuildCommands(client.user.id, process.env.GuildID), { body: commands })
        .then(() => console.log('✅ Slash commands registered!'))
        .catch((err) => console.error('❌ Error registering commands:', err));
}

client.on("ready", () => {
    console.log("=========================================");
    console.log(`🤖 Bot online: ${client.user.tag}`);
    console.log(`📍 Guild ID: ${process.env.GuildID}`);
    console.log("=========================================");
    
    client.user.setPresence({ 
        activities: [{ name: 'over obfuscation', type: ActivityType.Watching }] 
    });
    
    deployCommands();
    loadCommands();
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;
    if (!commandMap.has(interaction.commandName)) return;
    
    try {
        const command = commandMap.get(interaction.commandName);
        await command.execute(interaction, interaction.member, client);
    } catch (e) {
        console.error(`❌ Error in command ${interaction.commandName}:`, e);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle("❌ Error")
            .setDescription(`\`\`\`${e.message}\`\`\``)
            .setColor("#ff0000");
        
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch (err) {}
    }
});

client.login(process.env.TOKEN);

// Health check server untuk Render
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot is running!');
});

server.listen(process.env.PORT || 3000, () => {
    console.log('🌐 Health check server running');
});
