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

        // ============ DEBUG: CEK STRUKTUR FOLDER ============
        const appDir = path.join(__dirname, '..');
        console.log('==================== DEBUG ====================');
        console.log('Current directory (__dirname):', __dirname);
        console.log('App directory:', appDir);
        
        // List semua folder/file di root app
        console.log('\n📁 Files in app root:');
        try {
            const rootFiles = fs.readdirSync(appDir);
            rootFiles.forEach(f => {
                const fullPath = path.join(appDir, f);
                const isDir = fs.statSync(fullPath).isDirectory();
                console.log(`  ${isDir ? '📁' : '📄'} ${f}`);
            });
        } catch (e) {
            console.log('Error reading app dir:', e.message);
        }

        // Cek folder Source
        const sourceDir = path.join(appDir, 'Source');
        console.log('\n📁 Checking "Source" folder:', sourceDir);
        console.log('Source exists?:', fs.existsSync(sourceDir));
        
        if (fs.existsSync(sourceDir)) {
            console.log('Files in Source:');
            const sourceFiles = fs.readdirSync(sourceDir);
            sourceFiles.forEach(f => console.log(`  - ${f}`));
        }

        // Cek kemungkinan path lain
        const possiblePaths = [
            path.join(appDir, 'Source', 'IronBrew2 CLI.dll'),
            path.join(appDir, 'Source', 'IronBrew2.CLI.dll'),
            path.join(appDir, 'Source', 'IronBrew2CLI.dll'),
            path.join(appDir, 'IronBrew2 CLI.dll'),
            path.join(appDir, 'IronBrew2.CLI.dll'),
            path.join(appDir, 'IronBrew2', 'IronBrew2 CLI.dll'),
            path.join(appDir, 'IronBrew2.CLI', 'IronBrew2.CLI.dll'),
        ];

        console.log('\n🔍 Checking possible paths:');
        let foundPath = null;
        for (const p of possiblePaths) {
            const exists = fs.existsSync(p);
            console.log(`  ${exists ? '✅' : '❌'} ${p}`);
            if (exists && !foundPath) {
                foundPath = p;
            }
        }

        console.log('\n✅ Found path:', foundPath);
        console.log('================================================');
        // ============ END DEBUG ============

        // Kirim info debug ke Discord juga
        if (!foundPath) {
            // List semua folder untuk debug
            let debugInfo = '**App Directory:** `' + appDir + '`\n\n';
            debugInfo += '**Files in root:**\n```\n';
            try {
                const rootFiles = fs.readdirSync(appDir);
                rootFiles.forEach(f => {
                    const fullPath = path.join(appDir, f);
                    const isDir = fs.statSync(fullPath).isDirectory();
                    debugInfo += `${isDir ? '[DIR] ' : '      '} ${f}\n`;
                });
            } catch (e) {
                debugInfo += 'Error: ' + e.message;
            }
            debugInfo += '```';

            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('❌ IronBrew2 Not Found - Debug Info')
                        .setDescription(debugInfo)
                        .setColor('#ff0000')
                ]
            });
        }

        // Lanjut proses obfuscate jika path ditemukan
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

        try {
            const response = await fetch(attachment.url);
            const scriptContent = await response.text();

            const inputFile = tmp.fileSync({ suffix: '.lua' });
            const outputFile = tmp.fileSync({ suffix: '.lua' });

            fs.writeFileSync(inputFile.name, scriptContent, 'utf8');

            const command = `dotnet "${foundPath}" "${inputFile.name}" --output "${outputFile.name}"`;
            console.log('Executing:', command);

            exec(command, { timeout: 120000 }, async (error, stdout, stderr) => {
                console.log('stdout:', stdout);
                console.log('stderr:', stderr);

                if (error) {
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

                if (!fs.existsSync(outputFile.name) || fs.readFileSync(outputFile.name).length === 0) {
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
