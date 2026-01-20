const {
    SlashCommandBuilder,
    EmbedBuilder,
} = require('discord.js');
const fetch = require('node-fetch');
const tmp = require("tmp");
const fs = require("fs");

const IB2 = require("../ib2.js");

async function run(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const attachment = interaction.options.getAttachment("code");

    // Validasi file
    if (!attachment.name.endsWith('.lua')) {
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Error")
                    .setDescription("File harus berformat `.lua`!")
                    .setColor("#ff0000")
            ]
        });
    }

    try {
        const response = await fetch(attachment.url);
        const text = await response.text();

        IB2(text).then(async (src) => {
            const input = tmp.fileSync({ suffix: '.lua' });

            fs.writeFileSync(input.name, src);

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("✅ Completed")
                        .setDescription("Successfully obfuscated your code!")
                        .setColor("#00ff00")
                ],
                files: [
                    {
                        name: "Protected.lua",
                        attachment: input.name
                    }
                ]
            });

            input.removeCallback();
        }).catch(async (err) => {
            console.log("IB2 Error:", err);
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("❌ Error")
                        .setDescription(`Obfuscation failed:\n\`\`\`${err}\`\`\``)
                        .setColor("#ff0000")
                ]
            });
        });

    } catch (err) {
        console.log("Fetch Error:", err);
        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("❌ Error")
                    .setDescription("Failed to download file!")
                    .setColor("#ff0000")
            ]
        });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Obfuscate your lua script.')
        .addAttachmentOption(option =>
            option.setName('code')
                .setDescription('The lua script you want to obfuscate.')
                .setRequired(true)
        ),
    execute: run
};
