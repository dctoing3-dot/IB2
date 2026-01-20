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

        const appDir = path.join(__dirname, '..');
        
        // Cek isi folder Ib2 untuk cari file .dll
        const ib2Dir = path.join(appDir, 'Ib2');
        
        console.log('Checking Ib2 folder:', ib2Dir);
        console.log('Ib2 exists?:', fs.existsSync(ib2Dir));
        
        if (fs.existsSync(ib2Dir)) {
            console.log('Files in Ib2:');
            fs.readdirSync(ib2Dir).forEach(f => console.log(`  - ${f}`));
        }

        // Kemungkinan path ke IronBrew2
        const possiblePaths = [
            path.join(appDir, 'Ib2', 'IronBrew2 CLI.dll'),
            path.join(appDir, 'Ib2', 'IronBrew2.CLI.dll'),
            path.join(appDir, 'Ib2', 'IronBrew2CLI.dll'),
            path.join(appDir, 'Ib2', 'Source', 'IronBrew2 CLI.dll'),
            path.join(appDir, 'Ib2', 'Source', 'IronBrew2.CLI.dll'),
        ];

        let ironbrewPath = null;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                ironbrewPath = p;
                break;
            }
        }

        // Jika tidak ketemu, cari semua .dll di folder Ib2
        if (!ironbrewPath && fs.existsSync(ib2Dir)) {
            const findDll = (dir) => {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory()) {
                        const found = findDll(fullPath);
                        if (found) return found;
                    } else if (file.toLowerCase().includes('ironbrew') && file.endsWith('.dll')) {
                        return fullPath;
                    }
                }
                return null;
            };
            ironbrewPath = findDll(ib2Dir);
        }

        // Jika masih tidak ketemu, tampilkan isi folder
        if (!ironbrewPath) {
            let debugInfo = '**Isi folder Ib2:**\n```\n';
            
            const listDir = (dir, indent = '') => {
                if (!fs.existsSync(dir)) return;
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory()) {
                        debugInfo += `${indent}[DIR] ${file}\n`;
                        listDir(fullPath, indent + '  ');
                    } else {
                        debugInfo += `${indent}      ${file}\n`;
                    }
                }
            };
            
            listDir(ib2Dir);
            debugInfo += '```';

            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('❌ IronBrew2 DLL Not Found')
                        .setDescription(debugInfo)
                        .setColor('#ff0000')
                ]
            });
        }

        console.log('Using IronBrew2 path:', ironbrewPath);

        // Validasi file
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
                        .setDescription('Maksimal **500KB**!')
                        .setColor('#ff0000')
                ]
            });
        }

        try {
            const response = await fetch(attachment.url);
            const scriptContent = await response.text();

            if (!scriptContent.trim()) {
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

            const command = `dotnet "${ironbrewPath}" "${inputFile.name}" --output "${outputFile.name}"`;
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
