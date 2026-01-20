const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const tmp = require('tmp');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Obfuscate a Lua script using IronBrew2')
        .addAttachmentOption(option =>
            option
                .setName('script')
                .setDescription('Upload your .lua file')
                .setRequired(true)
        ),

    async execute(interaction, member, client) {
        await interaction.deferReply();

        const attachment = interaction.options.getAttachment('script');

        if (!attachment.name.endsWith('.lua')) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('❌ Invalid File')
                        .setDescription('File harus berformat **`.lua`**!')
                        .setColor('#ff0000')
                ]
            });
        }

        if (attachment.size > 500000) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('❌ File Too Large')
                        .setDescription('File terlalu besar! Maksimal **500KB**.')
                        .setColor('#ff0000')
                ]
            });
        }

        try {
            const response = await fetch(attachment.url);
            const scriptContent = await response.text();

            if (!scriptContent || scriptContent.trim().length === 0) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('❌ Empty File')
                            .setDescription('File Lua kosong!')
                            .setColor('#ff0000')
                    ]
                });
            }

            const inputFile = tmp.fileSync({ suffix: '.lua' });
            const outputFile = tmp.fileSync({ suffix: '.lua' });

            fs.writeFileSync(inputFile.name, scriptContent, 'utf8');

            // Path ke IronBrew2 - SESUAI STRUKTUR REPO KAMU
            const ironbrewPath = path.join(__dirname, '..', 'Source', 'IronBrew2 CLI.dll');

            if (!fs.existsSync(ironbrewPath)) {
                console.error('IronBrew2 not found at:', ironbrewPath);
                inputFile.removeCallback();
                outputFile.removeCallback();
                
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('❌ Configuration Error')
                            .setDescription('IronBrew2 tidak ditemukan!')
                            .setColor('#ff0000')
                    ]
                });
            }

            // Jalankan IronBrew2 (pakai quotes karena ada spasi di nama file)
            const command = `dotnet "${ironbrewPath}" "${inputFile.name}" --output "${outputFile.name}"`;
            
            console.log('Executing:', command);

            exec(command, { timeout: 120000 }, async (error, stdout, stderr) => {
                if (stdout) console.log('stdout:', stdout);
                if (stderr) console.log('stderr:', stderr);

                if (error) {
                    console.error('Error:', error.message);
                    inputFile.removeCallback();
                    outputFile.removeCallback();
                    
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('❌ Obfuscation Failed')
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
                                .setTitle('❌ Output Error')
                                .setDescription('Gagal generate output!')
                                .setColor('#ff0000')
                        ]
                    });
                }

                const result = fs.readFileSync(outputFile.name);

                if (result.length === 0) {
                    inputFile.removeCallback();
                    outputFile.removeCallback();
                    
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('❌ Output Empty')
                                .setDescription('Output kosong!')
                                .setColor('#ff0000')
                        ]
                    });
                }

                const outputAttachment = new AttachmentBuilder(result, {
                    name: `obfuscated_${attachment.name}`
                });

                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('✅ Obfuscation Successful!')
                            .addFields(
                                { name: '📁 Original', value: `${attachment.size} bytes`, inline: true },
                                { name: '📦 Obfuscated', value: `${result.length} bytes`, inline: true }
                            )
                            .setColor('#00ff00')
                            .setTimestamp()
                    ],
                    files: [outputAttachment]
                });

                inputFile.removeCallback();
                outputFile.removeCallback();
            });

        } catch (error) {
            console.error('Error:', error);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('❌ Error')
                        .setDescription(`\`\`\`${error.message}\`\`\``)
                        .setColor('#ff0000')
                ]
            });
        }
    }
};
