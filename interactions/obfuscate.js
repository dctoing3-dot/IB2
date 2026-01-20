const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const tmp = require('tmp');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Obfuscate Lua script dengan IronBrew2')
        .addAttachmentOption(option =>
            option
                .setName('script')
                .setDescription('Upload file .lua')
                .setRequired(true)
        ),

    async execute(interaction, member, client) {
        await interaction.deferReply();

        const attachment = interaction.options.getAttachment('script');

        if (!attachment.name.endsWith('.lua')) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('❌ Error')
                        .setDescription('File harus berformat `.lua`!')
                        .setColor('#ff0000')
                ]
            });
        }

        if (attachment.size > 1000000) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('❌ Error')
                        .setDescription('File terlalu besar! Maksimal 1MB.')
                        .setColor('#ff0000')
                ]
            });
        }

        try {
            const response = await fetch(attachment.url);
            const scriptContent = await response.text();

            const inputFile = tmp.fileSync({ suffix: '.lua' });
            const outputFile = tmp.fileSync({ suffix: '.lua' });

            fs.writeFileSync(inputFile.name, scriptContent);

            const ironbrewPath = path.join(__dirname, '..', 'IronBrew2.CLI', 'IronBrew2.CLI.dll');

            if (!fs.existsSync(ironbrewPath)) {
                inputFile.removeCallback();
                outputFile.removeCallback();
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('❌ Error')
                            .setDescription('IronBrew2 tidak ditemukan!')
                            .setColor('#ff0000')
                    ]
                });
            }

            const command = `dotnet "${ironbrewPath}" "${inputFile.name}" "${outputFile.name}"`;

            exec(command, { timeout: 60000 }, async (error, stdout, stderr) => {
                if (error) {
                    console.error('Error:', stderr || error.message);
                    inputFile.removeCallback();
                    outputFile.removeCallback();
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('❌ Obfuscation Error')
                                .setDescription(`\`\`\`${stderr || error.message}\`\`\``)
                                .setColor('#ff0000')
                        ]
                    });
                }

                if (!fs.existsSync(outputFile.name)) {
                    inputFile.removeCallback();
                    outputFile.removeCallback();
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('❌ Error')
                                .setDescription('Gagal generate output!')
                                .setColor('#ff0000')
                        ]
                    });
                }

                const result = fs.readFileSync(outputFile.name);

                const outputAttachment = new AttachmentBuilder(result, {
                    name: `obfuscated_${attachment.name}`
                });

                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('✅ Obfuscation Berhasil!')
                            .setDescription(`📁 File: \`${attachment.name}\`\n📦 Size: ${result.length} bytes`)
                            .setColor('#00ff00')
                            .setTimestamp()
                    ],
                    files: [outputAttachment]
                });

                inputFile.removeCallback();
                outputFile.removeCallback();
            });

        } catch (error) {
            console.error(error);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('❌ Error')
                        .setDescription(error.message)
                        .setColor('#ff0000')
                ]
            });
        }
    }
};
