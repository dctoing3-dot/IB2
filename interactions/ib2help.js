const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ib2help')
        .setDescription('Check IronBrew2 CLI options'),

    async execute(interaction) {
        await interaction.deferReply();

        const ironbrewDll = path.join(__dirname, '..', 'Ib2', 'Source', 'IronBrew2 CLI.dll');

        if (!fs.existsSync(ironbrewDll)) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('❌ Error')
                        .setDescription('IronBrew2 not found!')
                        .setColor('#ff0000')
                ]
            });
        }

        // Coba jalankan dengan --help atau tanpa argumen
        exec(`dotnet "${ironbrewDll}" --help`, { timeout: 30000 }, async (error, stdout, stderr) => {
            let output = stdout || stderr || 'No output';
            
            // Jika --help tidak work, coba tanpa argumen
            if (error || output.includes('error') || output.trim() === '') {
                exec(`dotnet "${ironbrewDll}"`, { timeout: 30000 }, async (error2, stdout2, stderr2) => {
                    output = stdout2 || stderr2 || 'No output';
                    
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('📖 IronBrew2 CLI Info')
                                .setDescription(`\`\`\`${output.substring(0, 4000)}\`\`\``)
                                .setColor('#00ff00')
                        ]
                    });
                });
                return;
            }

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('📖 IronBrew2 CLI Options')
                        .setDescription(`\`\`\`${output.substring(0, 4000)}\`\`\``)
                        .setColor('#00ff00')
                ]
            });
        });
    }
};
